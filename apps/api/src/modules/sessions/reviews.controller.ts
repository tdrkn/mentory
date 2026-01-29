import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { SessionsService } from './sessions.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * POST /api/reviews/:sessionId
   * Leave review for completed session
   * Access: Mentee
   */
  @UseGuards(RolesGuard)
  @Roles('mentee', 'both')
  @Post(':sessionId')
  async createReview(
    @CurrentUser('id') menteeId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.sessionsService.createReview(menteeId, sessionId, dto);
  }
}
