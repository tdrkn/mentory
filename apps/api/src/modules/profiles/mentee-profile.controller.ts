import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { ProfilesService } from './profiles.service';
import { UpdateMenteeProfileDto } from './dto/update-mentee-profile.dto';

@Controller('profile/mentee')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentee', 'both')
export class MenteeProfileController {
  constructor(private readonly profilesService: ProfilesService) {}

  /**
   * GET /api/profile/mentee
   * Get mentee profile
   * Access: Mentee
   */
  @Get()
  async getMenteeProfile(@CurrentUser('id') userId: string) {
    return this.profilesService.getMenteeProfile(userId);
  }

  /**
   * PATCH /api/profile/mentee
   * Update mentee profile
   * Access: Mentee
   */
  @Patch()
  async updateMenteeProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMenteeProfileDto,
  ) {
    return this.profilesService.updateMenteeProfile(userId, dto);
  }
}
