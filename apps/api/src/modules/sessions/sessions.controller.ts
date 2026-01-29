import { Controller, Get, Patch, Param, Query, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { SessionsService } from './sessions.service';
import { UpdateSessionNotesDto } from './dto/update-session-notes.dto';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * GET /api/sessions
   * Get user's sessions (as mentor or mentee)
   * Access: Authenticated
   */
  @Get()
  async getSessions(
    @CurrentUser() user: { id: string; role: string },
    @Query('role') role?: 'mentor' | 'mentee',
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.sessionsService.getUserSessions(user.id, user.role, role, status, from, to);
  }

  /**
   * GET /api/sessions/:id
   * Get session details
   * Access: Session participant
   */
  @Get(':id')
  async getSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.sessionsService.getSessionDetails(userId, sessionId);
  }

  /**
   * GET /api/sessions/:id/video
   * Get video room info for session
   * Access: Session participant
   */
  @Get(':id/video')
  async getVideoRoom(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.sessionsService.getOrCreateVideoRoom(userId, sessionId);
  }

  /**
   * GET /api/sessions/:id/notes
   * Get session notes
   * Access: Mentor of the session
   */
  @Get(':id/notes')
  async getSessionNotes(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.sessionsService.getSessionNotes(userId, sessionId);
  }

  /**
   * PATCH /api/sessions/:id/notes
   * Update session notes
   * Access: Mentor of the session
   */
  @Patch(':id/notes')
  async updateSessionNotes(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
    @Body() dto: UpdateSessionNotesDto,
  ) {
    return this.sessionsService.updateSessionNotes(userId, sessionId, dto);
  }

  /**
   * PATCH /api/sessions/:id/complete
   * Mark session as completed
   * Access: Mentor
   */
  @Patch(':id/complete')
  async completeSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.sessionsService.completeSession(userId, sessionId);
  }
}
