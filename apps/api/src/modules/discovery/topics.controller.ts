import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, Public } from '../auth/decorators';
import { DiscoveryService } from './discovery.service';
import { CreateTopicDto } from './dto/create-topic.dto';

@Controller('topics')
export class TopicsController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  /**
   * GET /api/topics
   * Get all topics
   * Access: Public
   */
  @Public()
  @Get()
  async getAllTopics() {
    return this.discoveryService.getAllTopics();
  }

  /**
   * POST /api/topics
   * Create new topic (admin only)
   * Access: Admin
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  async createTopic(@Body() dto: CreateTopicDto) {
    return this.discoveryService.createTopic(dto);
  }
}
