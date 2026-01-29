import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { NotificationType } from '@prisma/client';
import { EMAIL_QUEUE } from './notifications.module';

// Notification types for type safety
export type NotificationData = {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
  ) {}

  async getNotifications(
    userId: string,
    unreadOnly: boolean,
    limit: number,
    offset: number,
  ) {
    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      total,
      hasMore: offset + notifications.length < total,
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { count };
  }

  async getSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    // TODO: Store settings in separate table or JSON field
    // For now, return default settings
    return {
      email: {
        sessionReminder: true,
        sessionBooked: true,
        sessionCanceled: true,
        newMessage: true,
        newReview: true,
        paymentReceived: true,
        marketingEmails: false,
      },
      push: {
        sessionReminder: true,
        sessionBooked: true,
        sessionCanceled: true,
        newMessage: true,
        newReview: true,
        paymentReceived: true,
      },
    };
  }

  async updateSettings(userId: string, dto: UpdateNotificationSettingsDto) {
    // TODO: Store settings in database
    return { updated: true };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { markedAsRead: result.count };
  }

  // ========== Notification Creation Methods ==========

  async createNotification(userId: string, data: NotificationData) {
    return this.prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data,
      },
    });
  }

  async notifySessionBooked(mentorId: string, session: any) {
    const notification = await this.createNotification(mentorId, {
      type: 'session_booked',
      title: 'New Session Request',
      body: `${session.mentee.fullName} has requested a session on ${session.startAt}`,
      data: { sessionId: session.id },
    });

    // Queue email notification
    await this.queueEmail('session_booked', {
      userId: mentorId,
      to: session.mentor.email,
      context: {
        mentorName: session.mentor.fullName,
        menteeName: session.mentee.fullName,
        sessionDate: new Date(session.startAt).toLocaleDateString('ru-RU'),
        sessionTime: new Date(session.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        topic: session.topic?.name || 'Общее менторство',
        sessionLink: `${process.env.WEB_URL || 'http://localhost:3000'}/sessions/${session.id}`,
      },
    });

    return notification;
  }

  async notifySessionConfirmed(menteeId: string, session: any) {
    await this.createNotification(menteeId, {
      type: 'session_confirmed',
      title: 'Session Confirmed',
      body: `${session.mentor.fullName} has confirmed your session`,
      data: { sessionId: session.id },
    });

    // TODO: Send email notification
  }

  async notifySessionCanceled(userId: string, session: any, canceledBy: string) {
    await this.createNotification(userId, {
      type: 'session_canceled',
      title: 'Session Canceled',
      body: `Your session has been canceled`,
      data: { sessionId: session.id, canceledBy },
    });

    // TODO: Send email notification
  }

  async notifySessionReminder(userId: string, session: any, minutesBefore: number) {
    await this.createNotification(userId, {
      type: 'session_reminder',
      title: 'Session Reminder',
      body: `Your session starts in ${minutesBefore} minutes`,
      data: { sessionId: session.id },
    });

    // TODO: Send push notification
  }

  async notifyNewMessage(userId: string, sender: any, conversationId: string, recipientEmail: string, recipientName: string, messagePreview: string) {
    const notification = await this.createNotification(userId, {
      type: 'new_message',
      title: 'New Message',
      body: `${sender.fullName} sent you a message`,
      data: { conversationId, senderId: sender.id },
    });

    // Queue email notification
    await this.queueEmail('new_message', {
      userId,
      to: recipientEmail,
      context: {
        recipientName,
        senderName: sender.fullName,
        messagePreview: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
        conversationLink: `${process.env.WEB_URL || 'http://localhost:3000'}/chat/${conversationId}`,
        unsubscribeLink: `${process.env.WEB_URL || 'http://localhost:3000'}/settings/notifications`,
      },
    });

    return notification;
  }

  async notifyNewReview(mentorId: string, review: any) {
    await this.createNotification(mentorId, {
      type: 'new_review',
      title: 'New Review',
      body: `You received a ${review.rating}-star review`,
      data: { reviewId: review.id, sessionId: review.sessionId },
    });

    // TODO: Send email notification
  }

  async notifyPaymentReceived(mentorId: string, payment: any, mentorEmail: string, mentorName: string) {
    const notification = await this.createNotification(mentorId, {
      type: 'payment_received',
      title: 'Payment Received',
      body: `You received a payment of $${(payment.mentorAmount / 100).toFixed(2)}`,
      data: { paymentId: payment.id, sessionId: payment.sessionId },
    });

    // Queue email notification
    await this.queueEmail('payment_received', {
      userId: mentorId,
      to: mentorEmail,
      context: {
        mentorName,
        menteeName: payment.session?.mentee?.fullName || 'Mentee',
        amount: (payment.mentorAmount / 100).toFixed(2),
        currency: payment.currency || 'USD',
        sessionDate: payment.session?.startAt ? new Date(payment.session.startAt).toLocaleDateString('ru-RU') : 'N/A',
      },
    });

    return notification;
  }

  async notifyPayoutSent(mentorId: string, payout: any) {
    await this.createNotification(mentorId, {
      type: 'payout_sent',
      title: 'Payout Sent',
      body: `Your payout of $${(payout.amount / 100).toFixed(2)} has been sent`,
      data: { payoutId: payout.id },
    });

    // TODO: Send email notification
  }

  // ========== Email Queue Methods ==========

  /**
   * Queue an email job for async processing
   */
  private async queueEmail(
    jobType: string,
    data: {
      userId: string;
      to: string;
      context: Record<string, any>;
    },
  ) {
    try {
      const job = await this.emailQueue.add(jobType, data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2s, then 4s, 8s
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs for debugging
      });

      this.logger.log(`Queued ${jobType} email job ${job.id} for user ${data.userId}`);
      return job;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to queue ${jobType} email: ${errorMessage}`);
      // Don't throw - email failure shouldn't break the main flow
      return null;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
    ]);

    return {
      queue: EMAIL_QUEUE,
      waiting,
      active,
      completed,
      failed,
    };
  }
}
