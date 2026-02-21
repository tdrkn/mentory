import { Injectable, NotFoundException, BadRequestException, ForbiddenException, GoneException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreatePayoutAccountDto } from './dto/create-payout-account.dto';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { PayoutStatus } from '@prisma/client';

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
    const payment = await this.prisma.payment.findFirst({
      where: { providerPaymentId },
    });

    if (!payment) return;

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'succeeded', paidAt: new Date() },
      }),
      this.prisma.session.update({
        where: { id: payment.sessionId },
        data: { status: 'paid' },
      }),
    ]);
  }

  private async handlePaymentFailure(providerPaymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { providerPaymentId },
    });

    if (!payment) return;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
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
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.mentorId !== userId && payment.session.menteeId !== userId) {
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
    // Calculate available balance from completed sessions with succeeded payments
    const result = await this.prisma.payment.aggregate({
      where: {
        mentorId,
        status: 'succeeded',
        session: { status: 'completed' },
        // Exclude already paid out
        NOT: {
          id: {
            in: await this.prisma.payout
              .findMany({
                where: { mentorId, status: { in: ['pending', 'processing', 'completed'] as const } },
                select: { id: true },
              })
              .then((p) => p.map((x) => x.id)),
          },
        },
      },
      _sum: { mentorAmount: true },
      _count: true,
    });

    // Get pending payouts
    const pendingPayouts = await this.prisma.payout.aggregate({
      where: { mentorId, status: 'pending' },
      _sum: { amount: true },
    });

    return {
      available: result._sum?.mentorAmount ?? 0,
      pending: pendingPayouts._sum?.amount ?? 0,
      currency: 'USD', // TODO: Support multiple currencies
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
      select: { id: true, sessionId: true, status: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'refunded') {
      throw new BadRequestException('Refunded payment cannot be unfrozen');
    }

    const now = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'paid',
          paidAt: now,
        },
      }),
      this.prisma.session.update({
        where: { id: payment.sessionId },
        data: { status: 'paid' },
      }),
    ]);

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
      select: { id: true, sessionId: true, status: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'refunded') {
      throw new BadRequestException('Payment already refunded');
    }

    const now = new Date();
    const [updatedPayment] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'refunded' },
      }),
      this.prisma.session.update({
        where: { id: payment.sessionId },
        data: {
          status: 'canceled',
          canceledAt: now,
          cancelReason: reason || 'Canceled by admin',
        },
      }),
    ]);

    return {
      action: 'cancel',
      processedBy: adminId,
      reason: reason || null,
      payment: updatedPayment,
    };
  }
}
