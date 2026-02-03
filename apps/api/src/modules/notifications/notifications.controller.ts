import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /api/notifications
   * Get user's notifications
   * Access: Authenticated
   */
  @Get()
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationsService.getNotifications(
      userId,
      unreadOnly === 'true',
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }

  /**
   * GET /api/notifications/unread-count
   * Get unread notifications count
   * Access: Authenticated
   */
  @Get('unread-count')
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  /**
   * GET /api/notifications/settings
   * Get notification settings
   * Access: Authenticated
   */
  @Get('settings')
  async getSettings(@CurrentUser('id') userId: string) {
    return this.notificationsService.getSettings(userId);
  }

  /**
   * PATCH /api/notifications/settings
   * Update notification settings
   * Access: Authenticated
   */
  @Patch('settings')
  async updateSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.notificationsService.updateSettings(userId, dto);
  }

  /**
   * PATCH /api/notifications/:id/read
   * Mark notification as read
   * Access: Owner
   */
  @Patch(':id/read')
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(userId, notificationId);
  }

  /**
   * PATCH /api/notifications/read-all
   * Mark all notifications as read
   * Access: Authenticated
   */
  @Patch('read-all')
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  /**
   * GET /api/notifications/queue-stats
   * Get email queue statistics (admin only)
   * Access: Admin
   */
  @Get('queue-stats')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getQueueStats() {
    return this.notificationsService.getQueueStats();
  }
}
