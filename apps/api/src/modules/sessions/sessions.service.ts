import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateSessionNotesDto } from './dto/update-session-notes.dto';
import { SessionStatus } from '@prisma/client';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserSessions(
    userId: string,
    userRole: string,
    roleFilter?: 'mentor' | 'mentee',
    status?: string,
    from?: string,
    to?: string,
  ) {
    const mentorScope =
      roleFilter !== undefined
        ? roleFilter === 'mentor'
        : userRole === 'mentor' || userRole === 'both';

    if (mentorScope) {
      await this.autoCancelExpiredMentorRequests(userId);
    }

    const where: any = {};

    // Determine which sessions to fetch
    if (roleFilter === 'mentor' || (userRole === 'mentor' && !roleFilter)) {
      where.mentorId = userId;
    } else if (roleFilter === 'mentee' || (userRole === 'mentee' && !roleFilter)) {
      where.menteeId = userId;
    } else {
      where.OR = [{ mentorId: userId }, { menteeId: userId }];
    }

    if (status) where.status = status as SessionStatus;
    if (from) where.startAt = { gte: new Date(from) };
    if (to) where.startAt = { ...where.startAt, lte: new Date(to) };

    return this.prisma.session.findMany({
      where,
      include: {
        mentor: { select: { id: true, fullName: true } },
        mentee: { select: { id: true, fullName: true } },
        service: { select: { id: true, title: true, durationMin: true } },
      },
      orderBy: { startAt: 'desc' },
    });
  }

  private async autoCancelExpiredMentorRequests(mentorId: string) {
    const expirationDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const staleSessions = await this.prisma.session.findMany({
      where: {
        mentorId,
        status: 'requested',
        createdAt: { lte: expirationDate },
      },
      select: {
        id: true,
        slotId: true,
      },
    });

    if (staleSessions.length === 0) {
      return;
    }

    const sessionIds = staleSessions.map((session) => session.id);
    const slotIds = staleSessions.map((session) => session.slotId);

    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: {
          id: { in: sessionIds },
          status: 'requested',
        },
        data: {
          status: 'canceled',
          canceledAt: now,
          cancelReason: 'Auto-canceled: mentor did not respond within 3 days',
        },
      }),
      this.prisma.slot.updateMany({
        where: {
          id: { in: slotIds },
          status: 'held',
        },
        data: {
          status: 'free',
          heldUntil: null,
        },
      }),
    ]);
  }

  async getSessionDetails(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        mentor: { select: { id: true, fullName: true, email: true } },
        mentee: { select: { id: true, fullName: true, email: true } },
        service: true,
        slot: true,
        videoRoom: true,
        review: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.mentorId !== userId && session.menteeId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return session;
  }

  async createBooking(menteeId: string, dto: CreateBookingDto) {
    // Get slot and verify it's free
    const slot = await this.prisma.slot.findUnique({
      where: { id: dto.slotId },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    if (slot.status !== 'free') {
      throw new BadRequestException('Slot is not available');
    }

    // Get service
    const service = await this.prisma.mentorService.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service || !service.isActive) {
      throw new NotFoundException('Service not found');
    }

    if (service.mentorId !== slot.mentorId) {
      throw new BadRequestException('Service does not belong to this mentor');
    }

    // Create session and update slot in transaction
    const session = await this.prisma.$transaction(async (tx) => {
      // Mark slot as booked
      await tx.slot.update({
        where: { id: dto.slotId },
        data: { status: 'booked' },
      });

      // Create session
      return tx.session.create({
        data: {
          mentorId: slot.mentorId,
          menteeId,
          serviceId: dto.serviceId,
          slotId: dto.slotId,
          status: 'requested',
          startAt: slot.startAt,
          endAt: slot.endAt,
        },
        include: {
          mentor: { select: { id: true, fullName: true } },
          service: true,
        },
      });
    });

    return session;
  }

  async confirmSession(mentorId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, mentorId, status: 'requested' },
    });

    if (!session) {
      throw new NotFoundException('Session not found or already processed');
    }

    return this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'booked' },
    });
  }

  async rejectSession(mentorId: string, sessionId: string, reason?: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, mentorId, status: 'requested' },
    });

    if (!session) {
      throw new NotFoundException('Session not found or already processed');
    }

    return this.prisma.$transaction(async (tx) => {
      // Free up the slot
      await tx.slot.update({
        where: { id: session.slotId },
        data: { status: 'free' },
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

  async cancelSession(userId: string, sessionId: string, reason?: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        OR: [{ mentorId: userId }, { menteeId: userId }],
        status: { in: ['requested', 'booked', 'paid'] },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found or cannot be canceled');
    }

    return this.prisma.$transaction(async (tx) => {
      // Free up the slot
      await tx.slot.update({
        where: { id: session.slotId },
        data: { status: 'free' },
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

  async completeSession(mentorId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, mentorId, status: { in: ['booked', 'paid'] } },
    });

    if (!session) {
      throw new NotFoundException('Session not found or cannot be completed');
    }

    return this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'completed' },
    });
  }

  async getOrCreateVideoRoom(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        OR: [{ mentorId: userId }, { menteeId: userId }],
      },
      include: { videoRoom: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.videoRoom) {
      return session.videoRoom;
    }

    // Create video room (placeholder - integrate with actual provider)
    const roomId = `mentory-${sessionId}`;

    return this.prisma.videoRoom.create({
      data: {
        sessionId,
        provider: 'daily',
        roomId,
        joinUrlMentee: `https://mentory.daily.co/${roomId}`,
        joinUrlMentor: `https://mentory.daily.co/${roomId}`,
      },
    });
  }

  async getSessionNotes(mentorId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, mentorId },
    });

    if (!session) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.sessionNote.findUnique({
      where: { sessionId_mentorId: { sessionId, mentorId } },
    });
  }

  async updateSessionNotes(mentorId: string, sessionId: string, dto: UpdateSessionNotesDto) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, mentorId },
    });

    if (!session) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.sessionNote.upsert({
      where: { sessionId_mentorId: { sessionId, mentorId } },
      create: {
        sessionId,
        mentorId,
        privateNotes: dto.privateNotes,
        sharedSummary: dto.sharedSummary,
      },
      update: {
        privateNotes: dto.privateNotes,
        sharedSummary: dto.sharedSummary,
      },
    });
  }

  async createReview(menteeId: string, sessionId: string, dto: CreateReviewDto) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, menteeId, status: 'completed' },
    });

    if (!session) {
      throw new NotFoundException('Session not found or not completed');
    }

    const reviewAvailableAt = new Date(session.endAt.getTime() + 24 * 60 * 60 * 1000);
    if (new Date() < reviewAvailableAt) {
      throw new BadRequestException('Review can be submitted only 24 hours after session end');
    }

    // Check if review already exists
    const existing = await this.prisma.review.findUnique({
      where: { sessionId },
    });

    if (existing) {
      throw new BadRequestException('Review already exists');
    }

    // FR: one review per mentee-mentor pair
    const existingPairReview = await this.prisma.review.findFirst({
      where: {
        menteeId,
        mentorId: session.mentorId,
      },
      select: { id: true },
    });

    if (existingPairReview) {
      throw new BadRequestException('Review for this mentor has already been submitted');
    }

    // Create review and update mentor rating
    const [review] = await this.prisma.$transaction([
      this.prisma.review.create({
        data: {
          sessionId,
          menteeId,
          mentorId: session.mentorId,
          rating: dto.rating,
          text: dto.text,
        },
      }),
      // Update mentor's average rating
      this.prisma.$executeRaw`
        UPDATE mentor_profiles
        SET rating_avg = (
          SELECT AVG(rating)::numeric(3,2) FROM reviews WHERE mentor_id = ${session.mentorId}
        ),
        rating_count = (
          SELECT COUNT(*) FROM reviews WHERE mentor_id = ${session.mentorId}
        )
        WHERE user_id = ${session.mentorId}
      `,
    ]);

    return review;
  }
}
