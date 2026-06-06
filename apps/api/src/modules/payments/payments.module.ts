// ============================================
// Payments Module - Payments & Payouts
// ============================================
// Tables: payments, payouts

import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PayoutsController } from './payouts.controller';
import { AdminPaymentsController } from './admin-payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController, PayoutsController, AdminPaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
