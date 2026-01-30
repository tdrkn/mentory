import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreatePayoutAccountDto } from './dto/create-payout-account.dto';
import { PaymentStatus, PayoutStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPaymentIntent(menteeId: string, dto: CreatePaymentIntentDto) {
    const session = await this.prisma.session.findFirst({
      where: { id: dto.sessionId, menteeId, status: 'booked' },
      include: { service: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
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
        provider: 'stripe',
        providerPaymentId: `pi_mock_${Date.now()}`, // Mock
      },
    });

    return {
      payment,
      clientSecret: `mock_secret_${payment.id}`, // Mock - would be paymentIntent.client_secret
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

  async requestPayout(mentorId: string) {
    const profile = await this.prisma.mentorProfile.findUnique({
      where: { userId: mentorId },
    });

    if (!profile?.stripeAccountId) {
      throw new BadRequestException('Payout account not connected');
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
        provider: 'stripe',
      },
    });

    // TODO: Initiate Stripe transfer
    // const transfer = await stripe.transfers.create({...});

    return payout;
  }
}
