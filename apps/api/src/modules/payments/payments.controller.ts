import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /api/payments/intent
   * Create payment intent for session
   * Access: Mentee
   */
  @UseGuards(RolesGuard)
  @Roles('mentee', 'both')
  @Post('intent')
  async createPaymentIntent(
    @CurrentUser('id') menteeId: string,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createPaymentIntent(menteeId, dto);
  }

  /**
   * POST /api/payments/webhook
   * Stripe webhook handler
   * Access: Public (verified by Stripe signature)
   */
  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    // TODO: Verify Stripe signature
    return this.paymentsService.handleWebhook(body);
  }

  /**
   * GET /api/payments
   * Get user's payment history
   * Access: Authenticated
   */
  @Get()
  async getPayments(
    @CurrentUser('id') userId: string,
    @Query('role') role?: 'mentor' | 'mentee',
  ) {
    return this.paymentsService.getUserPayments(userId, role);
  }

  /**
   * GET /api/payments/:id
   * Get payment details
   * Access: Payment participant
   */
  @Get(':id')
  async getPayment(
    @CurrentUser('id') userId: string,
    @Param('id') paymentId: string,
  ) {
    return this.paymentsService.getPaymentDetails(userId, paymentId);
  }
}
