import { Controller, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { SessionsService } from './sessions.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelSessionDto } from './dto/cancel-session.dto';

@Controller('booking')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * POST /api/booking
   * Book a session with mentor
   * Access: Mentee
   */
  @UseGuards(RolesGuard)
  @Roles('mentee', 'both')
  @Post()
  async createBooking(
    @CurrentUser('id') menteeId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.sessionsService.createBooking(menteeId, dto);
  }

  /**
   * PATCH /api/booking/:id/confirm
   * Confirm session request
   * Access: Mentor
   */
  @UseGuards(RolesGuard)
  @Roles('mentor', 'both')
  @Patch(':id/confirm')
  async confirmBooking(
    @CurrentUser('id') mentorId: string,
    @Param('id') sessionId: string,
  ) {
    return this.sessionsService.confirmSession(mentorId, sessionId);
  }

  /**
   * PATCH /api/booking/:id/reject
   * Reject session request
   * Access: Mentor
   */
  @UseGuards(RolesGuard)
  @Roles('mentor', 'both')
  @Patch(':id/reject')
  async rejectBooking(
    @CurrentUser('id') mentorId: string,
    @Param('id') sessionId: string,
    @Body() dto: CancelSessionDto,
  ) {
    return this.sessionsService.rejectSession(mentorId, sessionId, dto.reason);
  }

  /**
   * PATCH /api/booking/:id/cancel
   * Cancel a booked session
   * Access: Session participant
   */
  @Patch(':id/cancel')
  async cancelBooking(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
    @Body() dto: CancelSessionDto,
  ) {
    return this.sessionsService.cancelSession(userId, sessionId, dto.reason);
  }
}
