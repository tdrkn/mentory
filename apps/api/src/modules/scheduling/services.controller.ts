import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { SchedulingService } from './scheduling.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentor', 'both')
export class ServicesController {
  constructor(private readonly schedulingService: SchedulingService) {}

  /**
   * GET /api/services
   * Get mentor's services
   * Access: Mentor
   */
  @Get()
  async getServices(@CurrentUser('id') mentorId: string) {
    return this.schedulingService.getMentorServices(mentorId);
  }

  /**
   * POST /api/services
   * Create new service/rate
   * Access: Mentor
   */
  @Post()
  async createService(
    @CurrentUser('id') mentorId: string,
    @Body() dto: CreateServiceDto,
  ) {
    return this.schedulingService.createService(mentorId, dto);
  }

  /**
   * PATCH /api/services/:id
   * Update service
   * Access: Mentor
   */
  @Patch(':id')
  async updateService(
    @CurrentUser('id') mentorId: string,
    @Param('id') serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.schedulingService.updateService(mentorId, serviceId, dto);
  }

  /**
   * DELETE /api/services/:id
   * Delete/deactivate service
   * Access: Mentor
   */
  @Delete(':id')
  async deleteService(
    @CurrentUser('id') mentorId: string,
    @Param('id') serviceId: string,
  ) {
    return this.schedulingService.deleteService(mentorId, serviceId);
  }
}
