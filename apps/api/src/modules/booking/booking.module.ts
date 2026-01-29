// ============================================
// Booking Module - Session Hold & Confirm
// ============================================
// With Redis distributed lock for race condition protection

import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { RedisLockService } from './redis-lock.service';

@Module({
  controllers: [BookingController],
  providers: [BookingService, RedisLockService],
  exports: [BookingService],
})
export class BookingModule {}
