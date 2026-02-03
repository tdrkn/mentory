import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { BookingService } from './booking.service';
import { HoldSlotDto } from './dto/hold-slot.dto';
import { ConfirmSessionDto } from './dto/confirm-session.dto';
import { CancelSessionDto } from './dto/cancel-session.dto';

@Controller('booking')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /**
   * POST /api/booking/hold
   * Hold a slot for booking (10 min hold)
   * Access: Mentee
   * 
   * Creates a session with status=requested
   * Slot status: free -> held
   * Returns: session + hold expiry time
   */
  @UseGuards(RolesGuard)
  @Roles('mentee', 'both')
  @Post('hold')
  async holdSlot(
    @CurrentUser('id') menteeId: string,
    @Body() dto: HoldSlotDto,
  ) {
    return this.bookingService.holdSlot(menteeId, dto);
  }

  /**
   * POST /api/booking/confirm
   * Confirm session (after mentor approval or payment)
   * Access: Mentor or Mentee
   * 
   * Slot status: held -> booked
   * Session status: requested -> booked
   */
  @Post('confirm')
  async confirmSession(
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmSessionDto,
  ) {
    return this.bookingService.confirmSession(userId, dto);
  }

  /**
   * PATCH /api/booking/:id/cancel
   * Cancel a session
   * Access: Session participant
   * 
   * Slot status: held/booked -> free
   * Session status: * -> canceled
   */
  @Patch(':id/cancel')
  async cancelSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
    @Body() dto: CancelSessionDto,
  ) {
    return this.bookingService.cancelSession(userId, sessionId, dto.reason);
  }

  /**
   * GET /api/booking/:id
   * Get session details
   * Access: Session participant
   */
  @Get(':id')
  async getSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.bookingService.getSession(userId, sessionId);
  }

  /**
   * POST /api/booking/release-expired
   * Release expired holds (admin/cron)
   * Access: Admin
   */
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post('release-expired')
  async releaseExpired() {
    return this.bookingService.releaseExpiredHolds();
  }
}
