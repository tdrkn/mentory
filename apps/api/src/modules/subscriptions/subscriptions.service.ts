import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MentorshipPlanKind,
  MentorshipSubscriptionStatus,
  MentorshipTaskStatus,
  CreditTransactionType,
  CreditTransactionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma';
import {
  CreateMentorshipBookmarkDto,
  CreateMentorshipPlanDto,
  CreateMentorshipSubscriptionDto,
  CreateMentorshipTaskDto,
  RedeemCreditDto,
  TopupCreditDto,
  UpdateMentorshipBookmarkDto,
  UpdateMentorshipPlanDto,
  UpdateMentorshipSubscriptionStatusDto,
  UpdateMentorshipTaskDto,
} from './dto';

type CurrentUser = {
  id: string;
  role: UserRole | string;
};

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlan(user: CurrentUser, dto: CreateMentorshipPlanDto) {
    this.ensureMentorRole(user.role);

    const mentorId = user.role === 'admin' && dto.mentorId ? dto.mentorId : user.id;

    if (user.role !== 'admin' && mentorId !== user.id) {
      throw new ForbiddenException('Only admin can create plans for another mentor');
    }

    const mentor = await this.prisma.user.findUnique({
      where: { id: mentorId },
      select: { id: true, role: true },
    });

    if (!mentor) {
      throw new NotFoundException('Mentor not found');
    }

    if (!['mentor', 'both', 'admin'].includes(mentor.role)) {
      throw new BadRequestException('Target user cannot own mentorship plans');
    }

    return this.prisma.mentorshipPlan.create({
      data: {
        mentorId,
        title: dto.title,
        description: dto.description,
        kind: dto.kind || MentorshipPlanKind.subscription,
        priceAmount: dto.priceAmount,
        currency: this.normalizeCurrency(dto.currency),
        billingIntervalMonths: dto.billingIntervalMonths || 1,
        callsPerMonth: dto.callsPerMonth,
        sessionDurationMin: dto.sessionDurationMin,
        responseTimeHours: dto.responseTimeHours,
        includesUnlimitedChat: dto.includesUnlimitedChat ?? true,
      },
    });
  }

  async getMyPlans(user: CurrentUser) {
    this.ensureMentorRole(user.role);

    if (user.role === 'admin') {
      return this.prisma.mentorshipPlan.findMany({
        include: {
          mentor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.mentorshipPlan.findMany({
      where: { mentorId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMentorPlans(mentorId: string, includeInactive = false) {
    return this.prisma.mentorshipPlan.findMany({
      where: {
        mentorId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePlan(user: CurrentUser, planId: string, dto: UpdateMentorshipPlanDto) {
    const plan = await this.prisma.mentorshipPlan.findUnique({
      where: { id: planId },
      select: { id: true, mentorId: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (user.role !== 'admin' && plan.mentorId !== user.id) {
      throw new ForbiddenException('Only plan owner can update this plan');
    }

    return this.prisma.mentorshipPlan.update({
      where: { id: planId },
      data: {
        title: dto.title,
        description: dto.description,
        kind: dto.kind,
        priceAmount: dto.priceAmount,
        currency: dto.currency ? this.normalizeCurrency(dto.currency) : undefined,
        billingIntervalMonths: dto.billingIntervalMonths,
        callsPerMonth: dto.callsPerMonth,
        sessionDurationMin: dto.sessionDurationMin,
        responseTimeHours: dto.responseTimeHours,
        includesUnlimitedChat: dto.includesUnlimitedChat,
      },
    });
  }

  async createSubscription(user: CurrentUser, dto: CreateMentorshipSubscriptionDto) {
    this.ensureMenteeRole(user.role);

    const plan = await this.prisma.mentorshipPlan.findUnique({
      where: { id: dto.planId },
      select: {
        id: true,
        mentorId: true,
        kind: true,
        isActive: true,
        priceAmount: true,
        currency: true,
        billingIntervalMonths: true,
      },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found or inactive');
    }

    const existing = await this.prisma.mentorshipSubscription.findFirst({
      where: {
        mentorId: plan.mentorId,
        menteeId: user.id,
        status: { in: [MentorshipSubscriptionStatus.active, MentorshipSubscriptionStatus.paused] },
      },
      select: { id: true, status: true },
    });

    if (existing) {
      throw new BadRequestException('Active or paused subscription already exists for this mentor');
    }

    const now = new Date();
    const intervalMonths = plan.kind === MentorshipPlanKind.subscription
      ? Math.max(plan.billingIntervalMonths || 1, 1)
      : 1;

    return this.prisma.mentorshipSubscription.create({
      data: {
        mentorId: plan.mentorId,
        menteeId: user.id,
        planId: plan.id,
        status: MentorshipSubscriptionStatus.active,
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: this.addMonths(now, intervalMonths),
        nextBillingAt: plan.kind === MentorshipPlanKind.subscription
          ? this.addMonths(now, intervalMonths)
          : null,
        monthlyPrice: plan.priceAmount,
        currency: plan.currency,
        notes: dto.notes,
      },
      include: {
        plan: true,
      },
    });
  }

  async listMySubscriptions(user: CurrentUser) {
    const where = this.buildSubscriptionScope(user);

    return this.prisma.mentorshipSubscription.findMany({
      where,
      include: {
        plan: true,
        mentor: {
          select: { id: true, fullName: true, email: true },
        },
        mentee: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateSubscriptionStatus(
    user: CurrentUser,
    subscriptionId: string,
    dto: UpdateMentorshipSubscriptionStatusDto,
  ) {
    const subscription = await this.getSubscriptionForParticipant(user, subscriptionId);
    const now = new Date();

    if (dto.status === MentorshipSubscriptionStatus.active && subscription.status === MentorshipSubscriptionStatus.ended) {
      throw new BadRequestException('Ended subscriptions cannot be re-activated');
    }

    return this.prisma.mentorshipSubscription.update({
      where: { id: subscription.id },
      data: {
        status: dto.status,
        pausedAt: dto.status === MentorshipSubscriptionStatus.paused ? now : null,
        endedAt: dto.status === MentorshipSubscriptionStatus.ended ? now : null,
        notes: dto.reason ? this.mergeNotes(subscription.notes, dto.reason) : undefined,
      },
      include: {
        plan: true,
      },
    });
  }

  async getWorkspace(user: CurrentUser, subscriptionId: string) {
    const subscription = await this.getSubscriptionForParticipant(user, subscriptionId);

    const [tasks, bookmarks] = await Promise.all([
      this.prisma.mentorshipTask.findMany({
        where: { subscriptionId },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.mentorshipBookmark.findMany({
        where: { subscriptionId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      subscription,
      tasks,
      bookmarks,
    };
  }

  async listTasks(user: CurrentUser, subscriptionId: string) {
    await this.getSubscriptionForParticipant(user, subscriptionId);

    return this.prisma.mentorshipTask.findMany({
      where: { subscriptionId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createTask(user: CurrentUser, subscriptionId: string, dto: CreateMentorshipTaskDto) {
    const subscription = await this.getSubscriptionForParticipant(user, subscriptionId);

    this.ensureAssigneeInSubscription(dto.assigneeId, subscription.mentorId, subscription.menteeId);

    return this.prisma.mentorshipTask.create({
      data: {
        subscriptionId,
        createdById: user.id,
        assigneeId: dto.assigneeId,
        title: dto.title,
        description: dto.description,
        startDate: this.toDate(dto.startDate),
        dueDate: this.toDate(dto.dueDate),
      },
    });
  }

  async updateTask(
    user: CurrentUser,
    subscriptionId: string,
    taskId: string,
    dto: UpdateMentorshipTaskDto,
  ) {
    const subscription = await this.getSubscriptionForParticipant(user, subscriptionId);

    const task = await this.prisma.mentorshipTask.findFirst({
      where: {
        id: taskId,
        subscriptionId,
      },
      select: { id: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (dto.assigneeId) {
      this.ensureAssigneeInSubscription(dto.assigneeId, subscription.mentorId, subscription.menteeId);
    }

    return this.prisma.mentorshipTask.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        startDate: this.toDate(dto.startDate),
        dueDate: this.toDate(dto.dueDate),
        status: dto.status,
        completedAt: dto.status === MentorshipTaskStatus.done
          ? new Date()
          : dto.status
            ? null
            : undefined,
      },
    });
  }

  async listBookmarks(user: CurrentUser, subscriptionId: string) {
    await this.getSubscriptionForParticipant(user, subscriptionId);

    return this.prisma.mentorshipBookmark.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBookmark(user: CurrentUser, subscriptionId: string, dto: CreateMentorshipBookmarkDto) {
    await this.getSubscriptionForParticipant(user, subscriptionId);

    return this.prisma.mentorshipBookmark.create({
      data: {
        subscriptionId,
        createdById: user.id,
        title: dto.title,
        description: dto.description,
        url: dto.url,
      },
    });
  }

  async updateBookmark(
    user: CurrentUser,
    subscriptionId: string,
    bookmarkId: string,
    dto: UpdateMentorshipBookmarkDto,
  ) {
    await this.getSubscriptionForParticipant(user, subscriptionId);

    const bookmark = await this.prisma.mentorshipBookmark.findFirst({
      where: {
        id: bookmarkId,
        subscriptionId,
      },
      select: { id: true },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    return this.prisma.mentorshipBookmark.update({
      where: { id: bookmarkId },
      data: {
        title: dto.title,
        description: dto.description,
        url: dto.url,
      },
    });
  }

  async deleteBookmark(user: CurrentUser, subscriptionId: string, bookmarkId: string) {
    await this.getSubscriptionForParticipant(user, subscriptionId);

    const bookmark = await this.prisma.mentorshipBookmark.findFirst({
      where: {
        id: bookmarkId,
        subscriptionId,
      },
      select: { id: true },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    await this.prisma.mentorshipBookmark.delete({ where: { id: bookmarkId } });
    return { deleted: true };
  }

  async getMyCredits(userId: string) {
    const [balance, transactions] = await Promise.all([
      this.prisma.menteeCreditBalance.findUnique({
        where: { menteeId: userId },
      }),
      this.prisma.menteeCreditTransaction.findMany({
        where: { menteeId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      balance: balance || {
        menteeId: userId,
        amountCents: 0,
        currency: 'USD',
        expiresAt: null,
      },
      transactions,
    };
  }

  async topupCredits(userId: string, dto: TopupCreditDto) {
    const currency = this.normalizeCurrency(dto.currency);
    const expiresAt = dto.expiresInDays ? this.addDays(new Date(), dto.expiresInDays) : null;

    return this.prisma.$transaction(async (tx) => {
      const existingBalance = await tx.menteeCreditBalance.findUnique({
        where: { menteeId: userId },
      });

      if (existingBalance && existingBalance.currency !== currency && existingBalance.amountCents > 0) {
        throw new BadRequestException('Cannot top up with a different currency');
      }

      await tx.menteeCreditTransaction.create({
        data: {
          menteeId: userId,
          type: CreditTransactionType.topup,
          status: CreditTransactionStatus.succeeded,
          amountCents: dto.amountCents,
          currency,
          description: dto.description || 'Manual top-up',
          expiresAt,
        },
      });

      const balance = await tx.menteeCreditBalance.upsert({
        where: { menteeId: userId },
        update: {
          amountCents: { increment: dto.amountCents },
          currency,
          expiresAt,
        },
        create: {
          menteeId: userId,
          amountCents: dto.amountCents,
          currency,
          expiresAt,
        },
      });

      return balance;
    });
  }

  async redeemCredits(userId: string, dto: RedeemCreditDto) {
    const code = dto.code.trim().toUpperCase();
    const reward = this.resolveRedeemCode(code);

    if (!reward) {
      throw new BadRequestException('Unknown redemption code');
    }

    const alreadyUsed = await this.prisma.menteeCreditTransaction.findFirst({
      where: {
        menteeId: userId,
        type: CreditTransactionType.redeem,
        externalRef: code,
      },
      select: { id: true },
    });

    if (alreadyUsed) {
      throw new BadRequestException('This redemption code was already used');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.menteeCreditTransaction.create({
        data: {
          menteeId: userId,
          type: CreditTransactionType.redeem,
          status: CreditTransactionStatus.succeeded,
          amountCents: reward.amountCents,
          currency: reward.currency,
          description: reward.description,
          externalRef: code,
          expiresAt: reward.expiresAt,
        },
      });

      const balance = await tx.menteeCreditBalance.findUnique({
        where: { menteeId: userId },
      });

      if (balance && balance.currency !== reward.currency && balance.amountCents > 0) {
        throw new BadRequestException('Existing balance currency differs from code currency');
      }

      return tx.menteeCreditBalance.upsert({
        where: { menteeId: userId },
        update: {
          amountCents: { increment: reward.amountCents },
          currency: reward.currency,
          expiresAt: reward.expiresAt,
        },
        create: {
          menteeId: userId,
          amountCents: reward.amountCents,
          currency: reward.currency,
          expiresAt: reward.expiresAt,
        },
      });
    });
  }

  private buildSubscriptionScope(user: CurrentUser) {
    if (user.role === 'admin') {
      return {};
    }

    if (user.role === 'both') {
      return {
        OR: [{ mentorId: user.id }, { menteeId: user.id }],
      };
    }

    if (user.role === 'mentor') {
      return { mentorId: user.id };
    }

    return { menteeId: user.id };
  }

  private async getSubscriptionForParticipant(user: CurrentUser, subscriptionId: string) {
    const subscription = await this.prisma.mentorshipSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: true,
        mentor: {
          select: { id: true, fullName: true, email: true },
        },
        mentee: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (user.role !== 'admin' && subscription.mentorId !== user.id && subscription.menteeId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return subscription;
  }

  private ensureAssigneeInSubscription(assigneeId: string, mentorId: string, menteeId: string) {
    if (assigneeId !== mentorId && assigneeId !== menteeId) {
      throw new BadRequestException('Task assignee must be mentor or mentee of this subscription');
    }
  }

  private ensureMentorRole(role: string) {
    if (!['mentor', 'both', 'admin'].includes(role)) {
      throw new ForbiddenException('Mentor role required');
    }
  }

  private ensureMenteeRole(role: string) {
    if (!['mentee', 'both', 'admin'].includes(role)) {
      throw new ForbiddenException('Mentee role required');
    }
  }

  private mergeNotes(existing: string | null, reason: string) {
    const trimmed = reason.trim();
    if (!trimmed) {
      return existing || undefined;
    }
    const prefix = existing ? `${existing}\n` : '';
    return `${prefix}[${new Date().toISOString()}] ${trimmed}`;
  }

  private normalizeCurrency(input?: string) {
    return (input || 'USD').trim().toUpperCase();
  }

  private toDate(input?: string) {
    if (!input) {
      return undefined;
    }
    const parsed = new Date(input);
    if (Number.isNaN(parsed.valueOf())) {
      throw new BadRequestException('Invalid date format');
    }
    return parsed;
  }

  private addMonths(date: Date, months: number) {
    const output = new Date(date);
    output.setMonth(output.getMonth() + months);
    return output;
  }

  private addDays(date: Date, days: number) {
    const output = new Date(date);
    output.setDate(output.getDate() + days);
    return output;
  }

  private resolveRedeemCode(code: string) {
    const catalog: Record<string, { amountCents: number; currency: string; description: string; expiresAt: Date | null }> = {
      'MENTORY-START-10': {
        amountCents: 1000,
        currency: 'USD',
        description: 'Welcome bonus',
        expiresAt: this.addDays(new Date(), 365),
      },
      'MENTORY-TEAM-25': {
        amountCents: 2500,
        currency: 'USD',
        description: 'Team promo credit',
        expiresAt: this.addDays(new Date(), 180),
      },
    };

    return catalog[code] || null;
  }
}
