import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { CreateAvailabilityRuleDto } from './dto/create-availability-rule.dto';
import { CreateExceptionDto } from './dto/create-exception.dto';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SlotStatus, Prisma } from '@prisma/client';

/**
 * TIMEZONE STRATEGY:
 * 
 * 1. All dates are stored in UTC in the database
 * 2. API accepts and returns UTC (ISO 8601 format)
 * 3. Client is responsible for converting to user's local timezone
 * 4. Mentor's timezone is stored in user.timezone for reference
 * 
 * Why UTC?
 * - Avoids DST issues
 * - Consistent comparison in queries
 * - Frontend libraries handle conversion easily
 */

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Availability Rules
  // ============================================

  async getAvailabilityRules(mentorId: string) {
    const [rules, mentor] = await Promise.all([
      this.prisma.availabilityRule.findMany({
        where: { mentorId },
        orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.user.findUnique({
        where: { id: mentorId },
        select: { timezone: true },
      }),
    ]);

    return {
      rules,
      timezone: mentor?.timezone || 'UTC',
      note: 'Times are in mentor timezone. Slots are generated in UTC.',
    };
  }

  async createAvailabilityRule(mentorId: string, dto: CreateAvailabilityRuleDto) {
    // Validate time format
    if (!this.isValidTime(dto.startTime) || !this.isValidTime(dto.endTime)) {
      throw new BadRequestException('Invalid time format. Use HH:mm');
    }

    // Validate end > start
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    return this.prisma.availabilityRule.create({
      data: {
        mentorId,
        weekday: dto.weekday,
        startTime: dto.startTime,
        endTime: dto.endTime,
        timezone: dto.timezone || 'UTC',
      },
    });
  }

  async updateAvailabilityRules(mentorId: string, rules: CreateAvailabilityRuleDto[]) {
    // Replace all rules in transaction
    await this.prisma.$transaction([
      this.prisma.availabilityRule.deleteMany({ where: { mentorId } }),
      this.prisma.availabilityRule.createMany({
        data: rules.map((r) => ({
          mentorId,
          weekday: r.weekday,
          startTime: r.startTime,
          endTime: r.endTime,
          timezone: r.timezone || 'UTC',
        })),
      }),
    ]);

    return this.getAvailabilityRules(mentorId);
  }

  async deleteAvailabilityRule(mentorId: string, ruleId: string) {
    const rule = await this.prisma.availabilityRule.findFirst({
      where: { id: ruleId, mentorId },
    });

    if (!rule) {
      throw new NotFoundException('Rule not found');
    }

    return this.prisma.availabilityRule.delete({ where: { id: ruleId } });
  }

  private isValidTime(time: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  }

  // ============================================
  // Exceptions
  // ============================================

  async getExceptions(mentorId: string, from?: string, to?: string) {
    const where: Prisma.AvailabilityExceptionWhereInput = { mentorId };

    if (from) where.date = { gte: new Date(from) };
    if (to) where.date = { ...where.date as any, lte: new Date(to) };

    return this.prisma.availabilityException.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  async createException(mentorId: string, dto: CreateExceptionDto) {
    return this.prisma.availabilityException.create({
      data: {
        mentorId,
        date: new Date(dto.date),
        isAvailable: dto.isAvailable ?? false,
        note: dto.note,
      },
    });
  }

  async deleteException(mentorId: string, exceptionId: string) {
    const exception = await this.prisma.availabilityException.findFirst({
      where: { id: exceptionId, mentorId },
    });

    if (!exception) {
      throw new NotFoundException('Exception not found');
    }

    return this.prisma.availabilityException.delete({ where: { id: exceptionId } });
  }

  // ============================================
  // Slots - Public API
  // ============================================

  /**
   * Get available slots for a mentor
   * 
   * Logic:
   * - Return slots with status 'free'
   * - OR status 'held' WHERE held_until < NOW (expired holds)
   * - Release expired holds automatically
   * 
   * All times are in UTC!
   */
  async getAvailableSlots(mentorId: string, from?: string, to?: string) {
    const now = new Date();
    const fromDate = from ? new Date(from) : now;
    const toDate = to ? new Date(to) : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // First, release expired holds
    await this.releaseExpiredHolds(mentorId);

    // Get mentor timezone for response
    const mentor = await this.prisma.user.findUnique({
      where: { id: mentorId },
      select: { timezone: true },
    });

    // Get available slots
    const slots = await this.prisma.slot.findMany({
      where: {
        mentorId,
        startAt: { gte: fromDate, lte: toDate },
        status: 'free',
      },
      orderBy: { startAt: 'asc' },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
      },
    });

    return {
      slots,
      meta: {
        mentorId,
        mentorTimezone: mentor?.timezone || 'UTC',
        queryFrom: fromDate.toISOString(),
        queryTo: toDate.toISOString(),
        count: slots.length,
        note: 'All times are in UTC (ISO 8601)',
      },
    };
  }

  /**
   * Release expired held slots back to free
   */
  async releaseExpiredHolds(mentorId?: string) {
    const where: Prisma.SlotWhereInput = {
      status: 'held',
      heldUntil: { lt: new Date() },
    };

    if (mentorId) where.mentorId = mentorId;

    const result = await this.prisma.slot.updateMany({
      where,
      data: { status: 'free', heldUntil: null },
    });

    return result.count;
  }

  // ============================================
  // Slots - Mentor Management
  // ============================================

  async getMentorSlots(mentorId: string, from?: string, to?: string, status?: string) {
    const where: Prisma.SlotWhereInput = { mentorId };

    if (from) where.startAt = { gte: new Date(from) };
    if (to) where.startAt = { ...where.startAt as any, lte: new Date(to) };
    if (status) where.status = status as SlotStatus;

    return this.prisma.slot.findMany({
      where,
      orderBy: { startAt: 'asc' },
    });
  }

  async generateSlots(mentorId: string, dto: GenerateSlotsDto) {
    const rules = await this.prisma.availabilityRule.findMany({
      where: { mentorId },
    });

    if (rules.length === 0) {
      throw new BadRequestException('No availability rules defined');
    }

    const fromDate = new Date(dto.from);
    const toDate = new Date(dto.to);
    const slotDuration = dto.slotDurationMin || 60;
    const slots: { mentorId: string; startAt: Date; endAt: Date; status: SlotStatus }[] = [];

    // Get exceptions
    const exceptions = await this.prisma.availabilityException.findMany({
      where: {
        mentorId,
        date: { gte: fromDate, lte: toDate },
      },
    });
    const exceptionDates = new Set(
      exceptions.filter((e) => !e.isAvailable).map((e) => e.date.toISOString().split('T')[0]),
    );

    // Generate slots for each day
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const weekday = d.getDay() === 0 ? 7 : d.getDay();
      const dateStr = d.toISOString().split('T')[0];

      // Skip if exception (day off)
      if (exceptionDates.has(dateStr)) continue;

      const dayRules = rules.filter((r) => r.weekday === weekday);

      for (const rule of dayRules) {
        const [startHour, startMin] = rule.startTime.split(':').map(Number);
        const [endHour, endMin] = rule.endTime.split(':').map(Number);

        let slotStart = new Date(d);
        slotStart.setUTCHours(startHour, startMin, 0, 0);

        const windowEnd = new Date(d);
        windowEnd.setUTCHours(endHour, endMin, 0, 0);

        while (slotStart.getTime() + slotDuration * 60 * 1000 <= windowEnd.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);

          // Only create future slots
          if (slotStart > new Date()) {
            slots.push({
              mentorId,
              startAt: new Date(slotStart),
              endAt: slotEnd,
              status: 'free',
            });
          }

          slotStart = slotEnd;
        }
      }
    }

    // Create slots (skip existing)
    const result = await this.prisma.slot.createMany({
      data: slots,
      skipDuplicates: true,
    });

    return {
      created: result.count,
      requested: slots.length,
      skipped: slots.length - result.count,
    };
  }

  async deleteSlot(mentorId: string, slotId: string) {
    const slot = await this.prisma.slot.findFirst({
      where: { id: slotId, mentorId, status: 'free' },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found or already booked');
    }

    return this.prisma.slot.delete({ where: { id: slotId } });
  }

  // ============================================
  // Calendar
  // ============================================

  async getCalendar(mentorId: string, from: string, to: string) {
    const [slots, sessions] = await Promise.all([
      this.prisma.slot.findMany({
        where: {
          mentorId,
          startAt: { gte: new Date(from), lte: new Date(to) },
        },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.session.findMany({
        where: {
          mentorId,
          startAt: { gte: new Date(from), lte: new Date(to) },
          status: { notIn: ['canceled'] },
        },
        include: {
          mentee: { select: { id: true, fullName: true } },
          service: { select: { title: true } },
        },
        orderBy: { startAt: 'asc' },
      }),
    ]);

    return { slots, sessions };
  }

  // ============================================
  // Services
  // ============================================

  async getMentorServices(mentorId: string) {
    return this.prisma.mentorService.findMany({
      where: { mentorId },
      orderBy: { priceAmount: 'asc' },
    });
  }

  async createService(mentorId: string, dto: CreateServiceDto) {
    return this.prisma.mentorService.create({
      data: {
        mentorId,
        title: dto.title,
        durationMin: dto.durationMin,
        priceAmount: dto.priceAmount,
        currency: dto.currency || 'RUB',
        isActive: true,
      },
    });
  }

  async updateService(mentorId: string, serviceId: string, dto: UpdateServiceDto) {
    const service = await this.prisma.mentorService.findFirst({
      where: { id: serviceId, mentorId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return this.prisma.mentorService.update({
      where: { id: serviceId },
      data: dto,
    });
  }

  async deleteService(mentorId: string, serviceId: string) {
    const service = await this.prisma.mentorService.findFirst({
      where: { id: serviceId, mentorId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Soft delete - just deactivate
    return this.prisma.mentorService.update({
      where: { id: serviceId },
      data: { isActive: false },
    });
  }
}
