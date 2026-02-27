import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { TrustService } from './trust.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { AddComplaintMessageDto } from './dto/add-complaint-message.dto';

@Controller('complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentee', 'mentor', 'both', 'admin')
export class ComplaintsController {
  constructor(private readonly trustService: TrustService) {}

  @Get('mine')
  async getMine(@CurrentUser('id') userId: string) {
    return this.trustService.getMyComplaints(userId);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateComplaintDto,
  ) {
    return this.trustService.createComplaint(userId, dto);
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: { id: string; role: string },
    @Param('id') complaintId: string,
  ) {
    return this.trustService.getComplaintById(user.id, complaintId, user.role === 'admin');
  }

  @Post(':id/messages')
  async addMessage(
    @CurrentUser() user: { id: string; role: string },
    @Param('id') complaintId: string,
    @Body() dto: AddComplaintMessageDto,
  ) {
    return this.trustService.addComplaintMessage(user.id, complaintId, dto, user.role === 'admin');
  }
}
