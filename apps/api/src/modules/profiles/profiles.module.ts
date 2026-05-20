// ============================================
// Profiles Module - User Profile Management
// ============================================
// Tables: users, mentor_profiles, mentee_profiles, mentor_topics, topics

import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { MentorProfileController } from './mentor-profile.controller';
import { MenteeProfileController } from './mentee-profile.controller';
import { ProfilesService } from './profiles.service';
import { FileStorageService } from '../../common/file-storage.service';

@Module({
  controllers: [ProfilesController, MentorProfileController, MenteeProfileController],
  providers: [ProfilesService, FileStorageService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
