import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { PaymentsService } from './payments.service';
import { AdminUpdatePaymentDto } from './dto/admin-update-payment.dto';

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':id/freeze')
  async freezePayment(
    @CurrentUser('id') adminId: string,
    @Param('id') paymentId: string,
    @Body() dto: AdminUpdatePaymentDto,
  ) {
    return this.paymentsService.adminFreezePayment(adminId, paymentId, dto.reason);
  }

  @Post(':id/unfreeze')
  async unfreezePayment(
    @CurrentUser('id') adminId: string,
    @Param('id') paymentId: string,
    @Body() dto: AdminUpdatePaymentDto,
  ) {
    return this.paymentsService.adminUnfreezePayment(adminId, paymentId, dto.reason);
  }

  @Post(':id/cancel')
  async cancelPayment(
    @CurrentUser('id') adminId: string,
    @Param('id') paymentId: string,
    @Body() dto: AdminUpdatePaymentDto,
  ) {
    return this.paymentsService.adminCancelPayment(adminId, paymentId, dto.reason);
  }
}
