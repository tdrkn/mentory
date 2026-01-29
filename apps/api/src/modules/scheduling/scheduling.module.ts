// ============================================
// Scheduling Module - Availability & Slots
// ============================================
// Tables: availability_rules, availability_exceptions, slots, mentor_services

import { Module } from '@nestjs/common';
import { SchedulingController } from './scheduling.controller';
import { ServicesController } from './services.controller';
import { SchedulingService } from './scheduling.service';

@Module({
  controllers: [SchedulingController, ServicesController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
