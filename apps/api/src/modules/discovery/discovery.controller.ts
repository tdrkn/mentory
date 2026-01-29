import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import { Public } from '../auth/decorators';
import { DiscoveryService } from './discovery.service';
import { SearchMentorsDto } from './dto/search-mentors.dto';

@Controller('mentors')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  /**
   * GET /api/mentors
   * Search mentors with filters
   * Access: Public (but shows more for authenticated)
   */
  @Public()
  @Get()
  async searchMentors(@Query() query: SearchMentorsDto) {
    return this.discoveryService.searchMentors(query);
  }

  /**
   * GET /api/mentors/:id
   * Get mentor public profile
   * Access: Public
   */
  @Public()
  @Get(':id')
  async getMentor(@Param('id') id: string) {
    return this.discoveryService.getMentorPublicProfile(id);
  }

  /**
   * GET /api/mentors/:id/services
   * Get mentor's services/rates
   * Access: Public
   */
  @Public()
  @Get(':id/services')
  async getMentorServices(@Param('id') mentorId: string) {
    return this.discoveryService.getMentorServices(mentorId);
  }

  /**
   * GET /api/mentors/:id/reviews
   * Get mentor's reviews
   * Access: Public
   */
  @Public()
  @Get(':id/reviews')
  async getMentorReviews(
    @Param('id') mentorId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.discoveryService.getMentorReviews(mentorId, page, limit);
  }

  /**
   * GET /api/mentors/:id/availability
   * Get mentor's available slots
   * Access: Authenticated
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/availability')
  async getMentorAvailability(
    @Param('id') mentorId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.discoveryService.getMentorAvailability(mentorId, from, to);
  }
}
