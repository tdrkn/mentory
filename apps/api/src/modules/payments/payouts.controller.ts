import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { PaymentsService } from './payments.service';
import { CreatePayoutAccountDto } from './dto/create-payout-account.dto';
import { RequestPayoutDto } from './dto/request-payout.dto';

@Controller('payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentor', 'both')
export class PayoutsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * GET /api/payouts
   * Get mentor's payout history
   * Access: Mentor
   */
  @Get()
  async getPayouts(
    @CurrentUser('id') mentorId: string,
    @Query('status') status?: string,
  ) {
    return this.paymentsService.getMentorPayouts(mentorId, status);
  }

  /**
   * GET /api/payouts/balance
   * Get mentor's current balance
   * Access: Mentor
   */
  @Get('balance')
  async getBalance(@CurrentUser('id') mentorId: string) {
    return this.paymentsService.getMentorBalance(mentorId);
  }

  /**
   * GET /api/payouts/methods
   * Get available payout methods from acquirer side
   * Access: Mentor
   */
  @Get('methods')
  async getPayoutMethods() {
    return this.paymentsService.getSupportedPayoutMethods();
  }

  /**
   * POST /api/payouts/account
   * Connect Stripe account for payouts
   * Access: Mentor
   */
  @Post('account')
  async connectPayoutAccount(
    @CurrentUser('id') mentorId: string,
    @Body() dto: CreatePayoutAccountDto,
  ) {
    return this.paymentsService.connectPayoutAccount(mentorId, dto);
  }

  /**
   * POST /api/payouts/request
   * Request payout of available balance
   * Access: Mentor
   */
  @Post('request')
  async requestPayout(
    @CurrentUser('id') mentorId: string,
    @Body() dto: RequestPayoutDto,
  ) {
    return this.paymentsService.requestPayout(mentorId, dto);
  }
}
