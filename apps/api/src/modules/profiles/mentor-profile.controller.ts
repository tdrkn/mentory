import { Controller, Get, Patch, Put, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { ProfilesService } from './profiles.service';
import { UpdateMentorProfileDto } from './dto/update-mentor-profile.dto';
import { UpdateTopicsDto } from './dto/update-topics.dto';

@Controller('profile/mentor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentor', 'both')
export class MentorProfileController {
  constructor(private readonly profilesService: ProfilesService) {}

  /**
   * GET /api/profile/mentor
   * Get mentor profile
   * Access: Mentor
   */
  @Get()
  async getMentorProfile(@CurrentUser('id') userId: string) {
    return this.profilesService.getMentorProfile(userId);
  }

  /**
   * PATCH /api/profile/mentor
   * Update mentor profile
   * Access: Mentor
   */
  @Patch()
  async updateMentorProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMentorProfileDto,
  ) {
    return this.profilesService.updateMentorProfile(userId, dto);
  }

  /**
   * PUT /api/profile/mentor/topics
   * Replace all mentor topics
   * Access: Mentor
   */
  @Put('topics')
  async updateTopics(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTopicsDto,
  ) {
    return this.profilesService.setMentorTopics(userId, dto.topicIds);
  }

  /**
   * POST /api/profile/mentor/topics/:topicId
   * Add topic to mentor's expertise
   * Access: Mentor
   */
  @Post('topics/:topicId')
  async addTopic(
    @CurrentUser('id') userId: string,
    @Param('topicId') topicId: string,
  ) {
    return this.profilesService.addMentorTopic(userId, topicId);
  }

  /**
   * DELETE /api/profile/mentor/topics/:topicId
   * Remove topic from mentor's expertise
   * Access: Mentor
   */
  @Delete('topics/:topicId')
  async removeTopic(
    @CurrentUser('id') userId: string,
    @Param('topicId') topicId: string,
  ) {
    return this.profilesService.removeMentorTopic(userId, topicId);
  }

  /**
   * PATCH /api/profile/mentor/activate
   * Activate mentor profile (make visible)
   * Access: Mentor
   */
  @Patch('activate')
  async activate(@CurrentUser('id') userId: string) {
    return this.profilesService.setMentorActive(userId, true);
  }

  /**
   * PATCH /api/profile/mentor/deactivate
   * Deactivate mentor profile (hide from search)
   * Access: Mentor
   */
  @Patch('deactivate')
  async deactivate(@CurrentUser('id') userId: string) {
    return this.profilesService.setMentorActive(userId, false);
  }

  /**
   * GET /api/profile/mentor/mentees/:menteeId
   * Get mentee profile for mentor (only if they have shared sessions)
   * Access: Mentor
   */
  @Get('mentees/:menteeId')
  async getMenteeProfileForMentor(
    @CurrentUser('id') mentorId: string,
    @Param('menteeId') menteeId: string,
  ) {
    return this.profilesService.getMenteeProfileForMentor(mentorId, menteeId);
  }
}
