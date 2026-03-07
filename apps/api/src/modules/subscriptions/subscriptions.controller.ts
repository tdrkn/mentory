import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards';
import {
  CreateMentorshipBookmarkDto,
  CreateMentorshipPlanDto,
  CreateMentorshipSubscriptionDto,
  CreateMentorshipTaskDto,
  RedeemCreditDto,
  TopupCreditDto,
  UpdateMentorshipBookmarkDto,
  UpdateMentorshipPlanDto,
  UpdateMentorshipSubscriptionStatusDto,
  UpdateMentorshipTaskDto,
} from './dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('plans')
  async createPlan(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: CreateMentorshipPlanDto,
  ) {
    return this.subscriptionsService.createPlan(user, dto);
  }

  @Get('plans/me')
  async getMyPlans(@CurrentUser() user: { id: string; role: string }) {
    return this.subscriptionsService.getMyPlans(user);
  }

  @Get('plans/mentor/:mentorId')
  async getMentorPlans(
    @Param('mentorId') mentorId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.subscriptionsService.getMentorPlans(mentorId, includeInactive === 'true');
  }

  @Patch('plans/:planId')
  async updatePlan(
    @CurrentUser() user: { id: string; role: string },
    @Param('planId') planId: string,
    @Body() dto: UpdateMentorshipPlanDto,
  ) {
    return this.subscriptionsService.updatePlan(user, planId, dto);
  }

  @Post()
  async createSubscription(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: CreateMentorshipSubscriptionDto,
  ) {
    return this.subscriptionsService.createSubscription(user, dto);
  }

  @Get('mine')
  async getMySubscriptions(@CurrentUser() user: { id: string; role: string }) {
    return this.subscriptionsService.listMySubscriptions(user);
  }

  @Get('credits/me')
  async getMyCredits(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getMyCredits(userId);
  }

  @Post('credits/topup')
  async topupCredits(
    @CurrentUser('id') userId: string,
    @Body() dto: TopupCreditDto,
  ) {
    return this.subscriptionsService.topupCredits(userId, dto);
  }

  @Post('credits/redeem')
  async redeemCredits(
    @CurrentUser('id') userId: string,
    @Body() dto: RedeemCreditDto,
  ) {
    return this.subscriptionsService.redeemCredits(userId, dto);
  }

  @Patch(':subscriptionId/status')
  async updateSubscriptionStatus(
    @CurrentUser() user: { id: string; role: string },
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: UpdateMentorshipSubscriptionStatusDto,
  ) {
    return this.subscriptionsService.updateSubscriptionStatus(user, subscriptionId, dto);
  }

  @Get(':subscriptionId/workspace')
  async getWorkspace(
    @CurrentUser() user: { id: string; role: string },
    @Param('subscriptionId') subscriptionId: string,
  ) {
    return this.subscriptionsService.getWorkspace(user, subscriptionId);
  }

  @Get(':subscriptionId/tasks')
  async getTasks(
    @CurrentUser() user: { id: string; role: string },
    @Param('subscriptionId') subscriptionId: string,
  ) {
    return this.subscriptionsService.listTasks(user, subscriptionId);
  }

  @Post(':subscriptionId/tasks')
  async createTask(
    @CurrentUser() user: { id: string; role: string },
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: CreateMentorshipTaskDto,
  ) {
    return this.subscriptionsService.createTask(user, subscriptionId, dto);
  }

  @Patch(':subscriptionId/tasks/:taskId')
  async updateTask(
    @CurrentUser() user: { id: string; role: string },
    @Param('subscriptionId') subscriptionId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateMentorshipTaskDto,
  ) {
    return this.subscriptionsService.updateTask(user, subscriptionId, taskId, dto);
  }

  @Get(':subscriptionId/bookmarks')
  async getBookmarks(
    @CurrentUser() user: { id: string; role: string },
    @Param('subscriptionId') subscriptionId: string,
  ) {
    return this.subscriptionsService.listBookmarks(user, subscriptionId);
  }

  @Post(':subscriptionId/bookmarks')
  async createBookmark(
    @CurrentUser() user: { id: string; role: string },
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: CreateMentorshipBookmarkDto,
  ) {
    return this.subscriptionsService.createBookmark(user, subscriptionId, dto);
  }

  @Patch(':subscriptionId/bookmarks/:bookmarkId')
  async updateBookmark(
    @CurrentUser() user: { id: string; role: string },
    @Param('subscriptionId') subscriptionId: string,
    @Param('bookmarkId') bookmarkId: string,
    @Body() dto: UpdateMentorshipBookmarkDto,
  ) {
    return this.subscriptionsService.updateBookmark(user, subscriptionId, bookmarkId, dto);
  }

  @Delete(':subscriptionId/bookmarks/:bookmarkId')
  async deleteBookmark(
    @CurrentUser() user: { id: string; role: string },
    @Param('subscriptionId') subscriptionId: string,
    @Param('bookmarkId') bookmarkId: string,
  ) {
    return this.subscriptionsService.deleteBookmark(user, subscriptionId, bookmarkId);
  }

}
