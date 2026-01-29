// ============================================
// Discovery Module - Search & Browse Mentors
// ============================================
// Tables: users, mentor_profiles, mentor_topics, topics, mentor_services, reviews

import { Module } from '@nestjs/common';
import { DiscoveryController } from './discovery.controller';
import { TopicsController } from './topics.controller';
import { DiscoveryService } from './discovery.service';

@Module({
  controllers: [DiscoveryController, TopicsController],
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
