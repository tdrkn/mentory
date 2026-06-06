import { Injectable, NotFoundException, BadRequestException, ForbiddenException, GoneException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreatePayoutAccountDto } from './dto/create-payout-account.dto';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { MentorshipSubscriptionStatus, PayoutStatus } from '@prisma/client';

const SUPPORTED_ACQUIRING_METHODS = ['qr', 'card', 'cbr'] as const;
const DEFAULT_ACQUIRER_CHECKOUT_BASE_URL = 'https://acquirer.example/checkout';
const SUPPORTED_PAYOUT_METHODS = [
  { id: 'card', label: 'Банковская карта', description: 'Зачисление на карту через эквайринг' },
  { id: 'korona_pay', label: 'korona.pay', description: 'Зачисление на счёт лицензированного приложения' },
  { id: 'cbr', label: 'CBR', description: 'Вывод через канал CBR в эквайринге' },
] as const;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPaymentIntent(menteeId: string, dto: CreatePaymentIntentDto) {
    if (!!dto.sessionId === !!dto.subscriptionId) {
      throw new BadRequestException('Provide exactly one of sessionId or subscriptionId');
    }

    if (dto.subscriptionId) {
      return this.createSubscriptionPaymentIntent(menteeId, dto.subscriptionId);
    }

    if (!dto.sessionId) {
      throw new BadRequestException('sessionId or subscriptionId is required');
    }

    const session = await this.prisma.session.findFirst({
      where: { id: dto.sessionId, menteeId, status: { in: ['requested', 'booked'] } },
      include: { service: true, slot: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // If session is still in requested status, ensure hold is valid
    if (session.status === 'requested') {
      const now = new Date();
      if (!session.slot || session.slot.status !== 'held' || !session.slot.heldUntil || session.slot.heldUntil < now) {
        // Release slot and cancel session if hold expired
        await this.prisma.$transaction([
          this.prisma.slot.update({
            where: { id: session.slotId },
            data: { status: 'free', heldUntil: null },
          }),
          this.prisma.session.update({
            where: { id: session.id },
            data: { status: 'canceled', canceledAt: now, cancelReason: 'Hold expired' },
          }),
        ]);
        throw new GoneException('Hold expired');
      }
    }

    // Check if payment already exists
    const existing = await this.prisma.payment.findUnique({
      where: { sessionId: dto.sessionId },
    });

    if (existing) {
      throw new BadRequestException('Payment already exists');
    }

    const amount = Math.round(Number(session.service.priceAmount) * 100); // Convert to cents
    const platformFee = Math.round(amount * 0.15); // 15% platform fee
    const mentorAmount = amount - platformFee;

    // TODO: Integrate with Stripe
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    // const paymentIntent = await stripe.paymentIntents.create({...});

    const payment = await this.prisma.payment.create({
      data: {
        sessionId: dto.sessionId,
        menteeId,
        mentorId: session.mentorId,
        amount,
        currency: session.service.currency,
        platformFee,
        mentorAmount,
        status: 'pending',
        provider: 'acquirer_mock',
        providerPaymentId: `pi_mock_${Date.now()}`, // Mock
      },
    });

    const checkoutBaseUrl = process.env.ACQUIRER_CHECKOUT_BASE_URL || DEFAULT_ACQUIRER_CHECKOUT_BASE_URL;
    const checkoutUrl = `${checkoutBaseUrl}/${payment.providerPaymentId}`;

    return {
      payment,
      clientSecret: `mock_secret_${payment.id}`, // Mock - would be paymentIntent.client_secret
      checkoutUrl,
      paymentMethods: [...SUPPORTED_ACQUIRING_METHODS],
    };
  }

  private async createSubscriptionPaymentIntent(menteeId: string, subscriptionId: string) {
    const subscription = await this.prisma.mentorshipSubscription.findFirst({
      where: {
        id: subscriptionId,
        menteeId,
        status: MentorshipSubscriptionStatus.approved_pending_payment,
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found or not approved for payment');
    }

    const existing = await this.prisma.payment.findUnique({
      where: { subscriptionId },
    });

    if (existing) {
      if (existing.status === 'failed' || existing.status === 'refunded') {
        throw new BadRequestException('Previous subscription payment is closed');
      }
      throw new BadRequestException('Payment already exists');
    }

    const amount = Math.round(Number(subscription.monthlyPrice ?? subscription.plan.priceAmount) * 100);
    const platformFee = Math.round(amount * 0.15);
    const mentorAmount = amount - platformFee;

    const payment = await this.prisma.payment.create({
      data: {
        subscriptionId,
        menteeId,
        mentorId: subscription.mentorId,
        amount,
        currency: subscription.currency || subscription.plan.currency,
        platformFee,
        mentorAmount,
        status: 'pending',
        provider: 'acquirer_mock',
        providerPaymentId: `pi_mock_sub_${Date.now()}`,
      },
    });

    const checkoutBaseUrl = process.env.ACQUIRER_CHECKOUT_BASE_URL || DEFAULT_ACQUIRER_CHECKOUT_BASE_URL;
    const checkoutUrl = `${checkoutBaseUrl}/${payment.providerPaymentId}`;

    return {
      payment,
      clientSecret: `mock_secret_${payment.id}`,
      checkoutUrl,
      paymentMethods: [...SUPPORTED_ACQUIRING_METHODS],
    };
  }

  async handleWebhook(body: any) {
    const { type, data } = body;

    switch (type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(data.object.id);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(data.object.id);
        break;
      case 'transfer.created':
        // Handle payout transfer
        break;
    }

    return { received: true };
  }

  private async handlePaymentSuccess(providerPaymentId: string) {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { providerPaymentId },
        include: {
          session: {
            include: { slot: true },
          },
          subscription: {
            include: { plan: true },
          },
        },
      });

      if (!payment) return;
      if (payment.status === 'refunded') return;

      if (payment.subscription) {
        const subscription = payment.subscription;
        const intervalMonths = Math.max(subscription.plan.billingIntervalMonths || 1, 1);

        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'succeeded', paidAt: now },
        });

        if (subscription.status === MentorshipSubscriptionStatus.approved_pending_payment) {
          await tx.mentorshipSubscription.update({
            where: { id: subscription.id },
            data: {
              status: MentorshipSubscriptionStatus.active,
              currentPeriodStart: now,
              currentPeriodEnd: this.addMonths(now, intervalMonths),
              nextBillingAt: this.addMonths(now, intervalMonths),
              endedAt: null,
              pausedAt: null,
            },
          });
        }
        return;
      }

      if (!payment.session) return;

      const { session } = payment;
      const holdExpired =
        session.slot.status === 'held' &&
        session.slot.heldUntil !== null &&
        session.slot.heldUntil < now;

      if (holdExpired) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'refunded', paidAt: now },
        });
        await tx.slot.update({
          where: { id: session.slotId },
          data: { status: 'free', heldUntil: null },
        });
        await tx.session.update({
          where: { id: session.id },
          data: {
            status: 'canceled',
            canceledAt: now,
            cancelReason: 'Payment succeeded after hold expired; refund required',
          },
        });
        return;
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'succeeded', paidAt: now },
      });
      await tx.slot.update({
        where: { id: session.slotId },
        data: { status: 'booked', heldUntil: null },
      });
      await tx.session.update({
        where: { id: session.id },
        data: { status: session.status === 'booked' ? 'booked' : 'paid' },
      });
    });
  }

  private async handlePaymentFailure(providerPaymentId: string) {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { providerPaymentId },
        include: {
          session: {
            include: { slot: true },
          },
          subscription: true,
        },
      });

      if (!payment) return;

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      });

      if (payment.subscription?.status === MentorshipSubscriptionStatus.approved_pending_payment) {
        return;
      }

      if (!payment.session) return;

      if (payment.session.status === 'requested' || payment.session.status === 'booked') {
        await tx.session.update({
          where: { id: payment.session.id },
          data: {
            status: 'canceled',
            canceledAt: now,
            cancelReason: 'Payment failed',
          },
        });
      }

      if (payment.session.slot.status === 'held') {
        await tx.slot.update({
          where: { id: payment.session.slotId },
          data: { status: 'free', heldUntil: null },
        });
      }
    });
  }

  async getUserPayments(userId: string, role?: 'mentor' | 'mentee') {
    const where: any = {};

    if (role === 'mentor') {
      where.mentorId = userId;
    } else if (role === 'mentee') {
      where.menteeId = userId;
    } else {
      where.OR = [{ mentorId: userId }, { menteeId: userId }];
    }

    return this.prisma.payment.findMany({
      where,
      include: {
        session: {
          include: {
            mentor: { select: { id: true, fullName: true } },
            mentee: { select: { id: true, fullName: true } },
            service: { select: { id: true, title: true } },
          },
        },
        subscription: {
          include: {
            mentor: { select: { id: true, fullName: true } },
            mentee: { select: { id: true, fullName: true } },
            plan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPaymentDetails(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        session: {
          include: {
            mentor: { select: { id: true, fullName: true } },
            mentee: { select: { id: true, fullName: true } },
            service: true,
          },
        },
        subscription: {
          include: {
            mentor: { select: { id: true, fullName: true } },
            mentee: { select: { id: true, fullName: true } },
            plan: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.mentorId !== userId && payment.menteeId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return payment;
  }

  async getMentorPayouts(mentorId: string, status?: string) {
    const where: any = { mentorId };
    if (status) where.status = status as PayoutStatus;

    return this.prisma.payout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMentorBalance(mentorId: string) {
    // Total earned from completed sessions with succeeded payments
    const earned = await this.prisma.payment.aggregate({
      where: { mentorId, status: 'succeeded', session: { status: 'completed' } },
      _sum: { mentorAmount: true },
    });

    // Total committed to payouts (pending/processing/completed)
    const paidOut = await this.prisma.payout.aggregate({
      where: { mentorId, status: { in: ['pending', 'processing', 'completed'] as const } },
      _sum: { amount: true },
    });

    const totalEarned = Number(earned._sum?.mentorAmount ?? 0);
    const totalPaidOut = Number(paidOut._sum?.amount ?? 0);
    const available = Math.max(0, totalEarned - totalPaidOut);

    const pendingPayouts = await this.prisma.payout.aggregate({
      where: { mentorId, status: 'pending' },
      _sum: { amount: true },
    });

    // Completed sessions count
    const sessionsCount = await this.prisma.session.count({
      where: { mentorId, status: 'completed' },
    });

    // Mentor rating
    const mentorProfile = await this.prisma.mentorProfile.findUnique({
      where: { userId: mentorId },
      select: { ratingAvg: true, ratingCount: true },
    });

    return {
      totalEarned,
      available,
      pending: Number(pendingPayouts._sum?.amount ?? 0),
      currency: 'RUB',
      sessionsCount,
      ratingAvg: Number(mentorProfile?.ratingAvg ?? 0),
      ratingCount: mentorProfile?.ratingCount ?? 0,
    };
  }

  getSupportedPayoutMethods() {
    return SUPPORTED_PAYOUT_METHODS.map((method) => ({
      id: method.id,
      label: method.label,
      description: method.description,
    }));
  }

  async connectPayoutAccount(mentorId: string, dto: CreatePayoutAccountDto) {
    // TODO: Create Stripe Connect account
    // const account = await stripe.accounts.create({...});

    await this.prisma.mentorProfile.update({
      where: { userId: mentorId },
      data: {
        stripeAccountId: `acct_mock_${Date.now()}`, // Mock
      },
    });

    return { connected: true };
  }

  async requestPayout(mentorId: string, dto: RequestPayoutDto) {
    const payoutMethod = SUPPORTED_PAYOUT_METHODS.find((method) => method.id === dto.method);
    if (!payoutMethod) {
      throw new BadRequestException('Unsupported payout method');
    }

    const balance = await this.getMentorBalance(mentorId);

    if (Number(balance.available) <= 0) {
      throw new BadRequestException('No available balance');
    }

    // Create payout record
    const payout = await this.prisma.payout.create({
      data: {
        mentorId,
        amount: balance.available,
        currency: balance.currency,
        status: 'pending',
        provider: `acquirer_mock_${dto.method}`,
      },
    });

    return {
      ...payout,
      method: payoutMethod.id,
      destinationTokenAccepted: !!dto.destinationToken,
    };
  }

  async processReadyPayouts(adminId: string) {
    const now = new Date();
    const duePayouts = await this.prisma.payout.findMany({
      where: {
        status: 'pending',
        availableAt: { lte: now },
      },
      include: {
        session: {
          include: {
            complaints: true,
          },
        },
      },
      orderBy: { availableAt: 'asc' },
    });

    let completed = 0;
    let blocked = 0;

    for (const payout of duePayouts) {
      const hasActiveComplaint = payout.session?.complaints.some((complaint) =>
        ['new', 'in_progress'].includes(complaint.status),
      );

      if (hasActiveComplaint) {
        blocked++;
        continue;
      }

      await this.prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: 'completed',
          provider: payout.provider || `processed_by_admin_${adminId}`,
        },
      });
      completed++;
    }

    return {
      checked: duePayouts.length,
      completed,
      blocked,
    };
  }

  async adminFreezePayment(adminId: string, paymentId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, status: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'refunded') {
      throw new BadRequestException('Refunded payment cannot be frozen');
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'pending' },
    });

    return {
      action: 'freeze',
      processedBy: adminId,
      reason: reason || null,
      payment: updated,
    };
  }

  async adminUnfreezePayment(adminId: string, paymentId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        sessionId: true,
        subscriptionId: true,
        status: true,
        session: { select: { status: true, slotId: true } },
        subscription: { include: { plan: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'refunded') {
      throw new BadRequestException('Refunded payment cannot be unfrozen');
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'paid',
          paidAt: now,
        },
      });
      if (payment.sessionId && payment.session) {
        const session = await tx.session.update({
          where: { id: payment.sessionId },
          data: { status: payment.session.status === 'booked' ? 'booked' : 'paid' },
          select: { slotId: true },
        });
        await tx.slot.update({
          where: { id: session.slotId },
          data: { status: 'booked', heldUntil: null },
        });
      }
      if (payment.subscriptionId && payment.subscription) {
        const now = new Date();
        const intervalMonths = Math.max(payment.subscription.plan.billingIntervalMonths || 1, 1);
        await tx.mentorshipSubscription.update({
          where: { id: payment.subscriptionId },
          data: {
            status: MentorshipSubscriptionStatus.active,
            currentPeriodStart: now,
            currentPeriodEnd: this.addMonths(now, intervalMonths),
            nextBillingAt: this.addMonths(now, intervalMonths),
            pausedAt: null,
            endedAt: null,
          },
        });
      }
      return updatedPayment;
    });

    return {
      action: 'unfreeze',
      processedBy: adminId,
      reason: reason || null,
      payment: updated,
    };
  }

  async adminCancelPayment(adminId: string, paymentId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, sessionId: true, subscriptionId: true, status: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'refunded') {
      throw new BadRequestException('Payment already refunded');
    }

    const now = new Date();
    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'refunded' },
      });
      if (payment.sessionId) {
        const session = await tx.session.update({
          where: { id: payment.sessionId },
          data: {
            status: 'canceled',
            canceledAt: now,
            cancelReason: reason || 'Canceled by admin',
          },
          select: { slotId: true },
        });
        await tx.slot.update({
          where: { id: session.slotId },
          data: { status: 'free', heldUntil: null },
        });
      }
      if (payment.subscriptionId) {
        await tx.mentorshipSubscription.update({
          where: { id: payment.subscriptionId },
          data: {
            status: MentorshipSubscriptionStatus.approved_pending_payment,
            notes: reason ? `[${now.toISOString()}] Payment canceled by admin: ${reason}` : undefined,
          },
        });
      }
      return updated;
    });

    return {
      action: 'cancel',
      processedBy: adminId,
      reason: reason || null,
      payment: updatedPayment,
    };
  }

  private addMonths(date: Date, months: number) {
    const output = new Date(date);
    output.setMonth(output.getMonth() + months);
    return output;
  }
}
