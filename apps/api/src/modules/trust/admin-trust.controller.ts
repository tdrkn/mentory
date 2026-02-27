import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { TrustService } from './trust.service';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { ReviewRegaliaDto } from './dto/review-regalia.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { CreateModerationActionDto } from './dto/create-moderation-action.dto';
import { CreatePlatformWithdrawalDto } from './dto/create-platform-withdrawal.dto';

@Controller('admin/trust')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminTrustController {
  constructor(private readonly trustService: TrustService) {}

  @Get('complaints')
  async listComplaints(@Query('status') status?: string) {
    return this.trustService.adminListComplaints(status);
  }

  @Patch('complaints/:id')
  async updateComplaint(
    @CurrentUser('id') adminId: string,
    @Param('id') complaintId: string,
    @Body() dto: UpdateComplaintDto,
  ) {
    return this.trustService.adminUpdateComplaint(adminId, complaintId, dto);
  }

  @Get('regalia')
  async listRegalia(@Query('status') status?: string) {
    return this.trustService.adminListRegalia(status);
  }

  @Patch('regalia/:id/review')
  async reviewRegalia(
    @CurrentUser('id') adminId: string,
    @Param('id') regaliaId: string,
    @Body() dto: ReviewRegaliaDto,
  ) {
    return this.trustService.adminReviewRegalia(adminId, regaliaId, dto);
  }

  @Post('users/:id/block')
  async blockUser(
    @CurrentUser('id') adminId: string,
    @Param('id') userId: string,
    @Body() dto: BlockUserDto,
  ) {
    return this.trustService.blockUser(adminId, userId, dto);
  }

  @Post('users/:id/unblock')
  async unblockUser(
    @CurrentUser('id') adminId: string,
    @Param('id') userId: string,
    @Body() dto: BlockUserDto,
  ) {
    return this.trustService.unblockUser(adminId, userId, dto);
  }

  @Post('moderation-actions')
  async createModerationAction(
    @CurrentUser('id') adminId: string,
    @Body() dto: CreateModerationActionDto,
  ) {
    return this.trustService.createModerationAction(adminId, dto);
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    return this.trustService.getAdminAuditLogs(Number(limit), Number(offset));
  }

  @Get('platform/balance')
  async getPlatformBalance() {
    return this.trustService.getPlatformBalance();
  }

  @Post('platform/withdraw')
  async withdrawPlatformFees(
    @CurrentUser('id') adminId: string,
    @Body() dto: CreatePlatformWithdrawalDto,
  ) {
    return this.trustService.createPlatformWithdrawal(adminId, dto);
  }
}
