// ============================================
// Sessions Module - Booking & Session Management
// ============================================
// Tables: sessions, slots, reviews, session_notes, video_rooms

import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { ReviewsController } from './reviews.controller';
import { SessionsService } from './sessions.service';

@Module({
  controllers: [SessionsController, ReviewsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
