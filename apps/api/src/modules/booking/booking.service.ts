import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { Prisma, SlotStatus, SessionStatus } from '@prisma/client';
import { RedisLockService } from './redis-lock.service';
import { HoldSlotDto } from './dto/hold-slot.dto';
import { ConfirmSessionDto } from './dto/confirm-session.dto';

/**
 * BOOKING FLOW:
 * 
 * 1. POST /sessions/hold
 *    - Acquire Redis lock on slot
 *    - Check slot is free (in transaction)
 *    - Update slot: free -> held, set held_until
 *    - Create session: status = booked_pending_payment
 *    - Release lock
 * 
 * 2. User has 10 minutes to pay
 * 
 * 3. POST /sessions/confirm (after payment)
 *    - Update slot: held -> booked
 *    - Update session: booked_pending_payment -> booked
 * 
 * 4. If hold expires:
 *    - Cron job or next request releases slot
 *    - slot: held -> free (if held_until < now)
 *    - session: booked_pending_payment -> canceled
 * 
 * STATUS DIAGRAMS:
 * 
 * Slot:
 *   free -> held (on hold)
 *   held -> booked (on confirm/payment)
 *   held -> free (on expiry/cancel)
 *   booked -> completed (after session)
 * 
 * Session:
 *   booked_pending_payment -> booked (on payment)
 *   booked_pending_payment -> canceled (on hold expiry)
 *   booked -> completed (after session ends)
 *   booked -> canceled (on cancel)
 */

const HOLD_DURATION_MINUTES = 10;

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: RedisLockService,
  ) {}

  /**
   * Hold a slot for booking
   * 
   * Protection against double booking:
   * 1. Redis distributed lock prevents concurrent requests
   * 2. Postgres transaction with row-level check
   * 3. held_until timestamp for automatic expiry
   */
  async holdSlot(menteeId: string, dto: HoldSlotDto) {
    const { slotId, serviceId } = dto;

    // Step 1: Acquire Redis lock
    const lockResult = await this.lockService.withLock(slotId, async () => {
      // Step 2: Transaction with row-level locking
      return this.prisma.$transaction(async (tx) => {
        // Lock the slot row for update (SELECT FOR UPDATE)
        const slot = await tx.$queryRaw<Array<{
          id: string;
          mentor_id: string;
          start_at: Date;
          end_at: Date;
          status: string;
          held_until: Date | null;
        }>>(Prisma.sql`
          SELECT id, mentor_id, start_at, end_at, status, held_until
          FROM slots
          WHERE id = ${slotId}::uuid
          FOR UPDATE
        `);

        if (!slot || slot.length === 0) {
          throw new NotFoundException('Slot not found');
        }

        const slotData = slot[0];

        // Check if slot is available
        if (slotData.status === 'booked') {
          throw new ConflictException('Slot is already booked');
        }

        if (slotData.status === 'held') {
          // Check if hold has expired
          if (slotData.held_until && slotData.held_until > new Date()) {
            throw new ConflictException('Slot is currently held by another user');
          }
          // Hold expired, we can proceed
        }

        // Check service exists and belongs to mentor
        const service = await tx.mentorService.findFirst({
          where: { id: serviceId, mentorId: slotData.mentor_id, isActive: true },
        });

        if (!service) {
          throw new NotFoundException('Service not found');
        }

        // Calculate hold expiry
        const heldUntil = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000);

        // Update slot status
        await tx.slot.update({
          where: { id: slotId },
          data: {
            status: 'held',
            heldUntil,
          },
        });

        // Create session
        const session = await tx.session.create({
          data: {
            mentorId: slotData.mentor_id,
            menteeId,
            slotId,
            serviceId,
            status: 'requested', // Will be 'booked_pending_payment' after mentor confirms
            startAt: slotData.start_at,
            endAt: slotData.end_at,
          },
          include: {
            mentor: { select: { id: true, fullName: true, email: true } },
            service: { select: { id: true, title: true, priceAmount: true, currency: true } },
            slot: { select: { id: true, startAt: true, endAt: true } },
          },
        });

        return {
          session,
          holdExpiresAt: heldUntil,
          holdDurationMinutes: HOLD_DURATION_MINUTES,
        };
      });
    });

    if (!lockResult.success) {
      throw new ConflictException(lockResult.error || 'Could not acquire lock');
    }

    return lockResult.result;
  }

  /**
   * Confirm session after payment
   * Updates slot and session status
   */
  async confirmSession(userId: string, dto: ConfirmSessionDto) {
    const { sessionId, paymentIntentId } = dto;

    return this.prisma.$transaction(async (tx) => {
      // Get session with lock
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: { slot: true },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      // Verify ownership (mentor confirms, or payment webhook)
      if (session.mentorId !== userId && session.menteeId !== userId) {
        throw new BadRequestException('Not authorized');
      }

      // Check session status
      if (session.status !== 'requested' && session.status !== 'booked') {
        throw new BadRequestException(`Cannot confirm session with status: ${session.status}`);
      }

      if (paymentIntentId) {
        const payment = await tx.payment.findUnique({
          where: { sessionId },
          select: {
            providerPaymentId: true,
            status: true,
            menteeId: true,
          },
        });

        if (!payment) {
          throw new BadRequestException('Payment not found for this session');
        }

        if (payment.menteeId !== session.menteeId) {
          throw new BadRequestException('Payment does not belong to session mentee');
        }

        if (payment.providerPaymentId !== paymentIntentId) {
          throw new BadRequestException('Payment intent does not match session payment');
        }

        if (payment.status !== 'succeeded' && payment.status !== 'paid') {
          throw new BadRequestException('Payment has not been confirmed by acquirer');
        }
      }

      // Check if hold expired
      if (session.slot.status === 'held' && session.slot.heldUntil && session.slot.heldUntil < new Date()) {
        // Release the slot
        await tx.slot.update({
          where: { id: session.slotId },
          data: { status: 'free', heldUntil: null },
        });

        await tx.session.update({
          where: { id: sessionId },
          data: { status: 'canceled', canceledAt: new Date(), cancelReason: 'Hold expired' },
        });

        throw new BadRequestException('Hold has expired. Please book again.');
      }

      // Update slot to booked
      await tx.slot.update({
        where: { id: session.slotId },
        data: {
          status: 'booked',
          heldUntil: null,
        },
      });

      // Update session
      const updatedSession = await tx.session.update({
        where: { id: sessionId },
        data: {
          status: 'booked',
        },
        include: {
          mentor: { select: { id: true, fullName: true } },
          mentee: { select: { id: true, fullName: true } },
          service: true,
          slot: true,
        },
      });

      return updatedSession;
    });
  }

  /**
   * Cancel a held or booked session
   */
  async cancelSession(userId: string, sessionId: string, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: { slot: true },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      // Verify ownership
      if (session.mentorId !== userId && session.menteeId !== userId) {
        throw new BadRequestException('Not authorized');
      }

      // Check if can be canceled
      if (!['requested', 'booked', 'paid'].includes(session.status)) {
        throw new BadRequestException(`Cannot cancel session with status: ${session.status}`);
      }

      // Release slot
      await tx.slot.update({
        where: { id: session.slotId },
        data: {
          status: 'free',
          heldUntil: null,
        },
      });

      // Cancel session
      return tx.session.update({
        where: { id: sessionId },
        data: {
          status: 'canceled',
          canceledAt: new Date(),
          cancelReason: reason,
        },
      });
    });
  }

  /**
   * Release expired holds (called by cron or on-demand)
   */
  async releaseExpiredHolds() {
    const now = new Date();

    // Find and release expired held slots
    const expiredSlots = await this.prisma.slot.findMany({
      where: {
        status: 'held',
        heldUntil: { lt: now },
      },
      include: {
        session: {
          where: { status: 'requested' },
        },
      },
    });

    let releasedCount = 0;

    for (const slot of expiredSlots) {
      const updates: any[] = [
        // Release slot
        this.prisma.slot.update({
          where: { id: slot.id },
          data: { status: 'free', heldUntil: null },
        }),
      ];

      // Cancel session if exists and is in requested status
      if (slot.session && slot.session.status === 'requested') {
        updates.push(
          this.prisma.session.update({
            where: { id: slot.session.id },
            data: {
              status: 'canceled',
              canceledAt: now,
              cancelReason: 'Hold expired',
            },
          }),
        );
      }

      await this.prisma.$transaction(updates);
      releasedCount++;
    }

    return { released: releasedCount };
  }

  /**
   * Get session by ID with full details
   */
  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        mentor: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        mentee: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        service: true,
        slot: true,
        payments: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.mentorId !== userId && session.menteeId !== userId) {
      throw new BadRequestException('Not authorized');
    }

    return session;
  }
}
