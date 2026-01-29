import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { ProfilesService } from './profiles.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  /**
   * GET /api/profile
   * Get current user's full profile
   * Access: Authenticated
   */
  @Get()
  async getProfile(@CurrentUser('id') userId: string) {
    return this.profilesService.getFullProfile(userId);
  }

  /**
   * PATCH /api/profile
   * Update basic user info (name, timezone)
   * Access: Authenticated
   */
  @Patch()
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.profilesService.updateUser(userId, dto);
  }
}
