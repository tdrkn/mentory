import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { NotificationType } from '@prisma/client';
import { EmailService } from './email.service';

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
  private readonly emailDeliveryStats = {
    attempted: 0,
    completed: 0,
    failed: 0,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
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
        payloadJson: data.data,
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

    // Send transactional email notification
    await this.queueEmail('session_booked', {
      userId: mentorId,
      to: session.mentor.email,
      context: {
        mentorName: session.mentor.fullName,
        menteeName: session.mentee.fullName,
        sessionDate: new Date(session.startAt).toLocaleDateString('ru-RU'),
        sessionTime: new Date(session.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        topic: session.topic?.name || 'Общее менторство',
        sessionLink: `${process.env.WEB_URL || process.env.PUBLIC_APP_URL || 'http://localhost:3000'}/sessions/${session.id}`,
      },
    });

    return notification;
  }

  async notifySessionConfirmed(menteeId: string, session: any) {
    await this.createNotification(menteeId, {
      type: 'session_confirmed',
      title: 'Сессия подтверждена',
      body: `${session.mentor.fullName} подтвердил(а) вашу сессию`,
      data: { sessionId: session.id },
    });

    this.emailService.sendEmail({
      to: session.mentee.email,
      subject: 'Сессия подтверждена — Mentory',
      template: 'session_booked',
      context: {
        mentorName: session.mentee.fullName,
        menteeName: session.mentor.fullName,
        sessionDate: new Date(session.startAt).toLocaleDateString('ru-RU'),
        sessionTime: new Date(session.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        topic: 'Менторская сессия',
        sessionLink: `${process.env.PUBLIC_APP_URL || 'http://localhost:3000'}/sessions/${session.id}`,
      },
    }).catch((e) => this.logger.warn(`Email failed for session_confirmed: ${e.message}`));
  }

  async notifySessionCanceled(userId: string, session: any, canceledBy: string) {
    await this.createNotification(userId, {
      type: 'session_canceled',
      title: 'Сессия отменена',
      body: `Ваша сессия была отменена`,
      data: { sessionId: session.id, canceledBy },
    });

    const recipient = userId === session.mentorId ? session.mentor : session.mentee;
    if (recipient?.email) {
      this.emailService.sendEmail({
        to: recipient.email,
        subject: 'Сессия отменена — Mentory',
        html: `<p>Привет, ${recipient.fullName}! Ваша сессия была отменена.</p>`,
      }).catch((e) => this.logger.warn(`Email failed for session_canceled: ${e.message}`));
    }
  }

  async notifySessionReminder(userId: string, session: any, minutesBefore: number) {
    await this.createNotification(userId, {
      type: 'session_reminder',
      title: 'Напоминание о сессии',
      body: `Ваша сессия начинается через ${minutesBefore} минут`,
      data: { sessionId: session.id },
    });

    const recipient = userId === session.mentorId ? session.mentor : session.mentee;
    if (recipient?.email) {
      this.emailService.sendEmail({
        to: recipient.email,
        subject: `Сессия через ${minutesBefore} минут — Mentory`,
        template: 'session_reminder',
        context: {
          recipientName: recipient.fullName,
          minutesBefore,
          sessionDate: new Date(session.startAt).toLocaleDateString('ru-RU'),
          sessionTime: new Date(session.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          sessionLink: `${process.env.PUBLIC_APP_URL || 'http://localhost:3000'}/sessions/${session.id}`,
        },
      }).catch((e) => this.logger.warn(`Email failed for session_reminder: ${e.message}`));
    }
  }

  async notifyNewMessage(userId: string, sender: any, conversationId: string, recipientEmail: string, recipientName: string, messagePreview: string) {
    const notification = await this.createNotification(userId, {
      type: 'new_message',
      title: 'New Message',
      body: `${sender.fullName} sent you a message`,
      data: { conversationId, senderId: sender.id },
    });

    // Send transactional email notification
    await this.queueEmail('new_message', {
      userId,
      to: recipientEmail,
      context: {
        recipientName,
        senderName: sender.fullName,
        messagePreview: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
        conversationLink: `${process.env.WEB_URL || process.env.PUBLIC_APP_URL || 'http://localhost:3000'}/chat/${conversationId}`,
        unsubscribeLink: `${process.env.WEB_URL || process.env.PUBLIC_APP_URL || 'http://localhost:3000'}/settings/notifications`,
      },
    });

    return notification;
  }

  async notifyNewReview(mentorId: string, review: any) {
    await this.createNotification(mentorId, {
      type: 'new_review',
      title: 'Новый отзыв',
      body: `Вы получили отзыв на ${review.rating} звезд(ы)`,
      data: { reviewId: review.id, sessionId: review.sessionId },
    });

    if (review.mentor?.email) {
      this.emailService.sendEmail({
        to: review.mentor.email,
        subject: 'Новый отзыв — Mentory',
        html: `<p>Привет, ${review.mentor.fullName}! Вы получили новый отзыв: ${review.rating} ⭐${review.text ? ` — "${review.text}"` : ''}.</p>`,
      }).catch((e) => this.logger.warn(`Email failed for new_review: ${e.message}`));
    }
  }

  async notifyPaymentReceived(mentorId: string, payment: any, mentorEmail: string, mentorName: string) {
    const notification = await this.createNotification(mentorId, {
      type: 'payment_received',
      title: 'Payment Received',
      body: `You received a payment of $${(payment.mentorAmount / 100).toFixed(2)}`,
      data: { paymentId: payment.id, sessionId: payment.sessionId },
    });

    // Send transactional email notification
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

  // ========== Email Delivery Methods ==========

  private async queueEmail(
    jobType: string,
    data: {
      userId: string;
      to: string;
      context: Record<string, any>;
    },
  ) {
    this.emailDeliveryStats.attempted += 1;
    try {
      await this.emailService.sendEmail({
        to: data.to,
        subject: this.getEmailSubject(jobType),
        template: jobType,
        context: data.context,
      });
      this.emailDeliveryStats.completed += 1;
    } catch (e) {
      this.emailDeliveryStats.failed += 1;
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Email delivery failed [${jobType}] for user ${data.userId}: ${msg}`);
    }
  }

  private getEmailSubject(jobType: string): string {
    const subjects: Record<string, string> = {
      session_booked: 'Новая сессия забронирована — Mentory',
      payment_received: 'Оплата получена — Mentory',
      new_message: 'Новое сообщение — Mentory',
      session_reminder: 'Напоминание о сессии — Mentory',
    };
    return subjects[jobType] || 'Уведомление — Mentory';
  }

  async getQueueStats() {
    return {
      queue: 'email',
      mode: 'direct-smtp',
      waiting: 0,
      active: 0,
      completed: this.emailDeliveryStats.completed,
      failed: this.emailDeliveryStats.failed,
      attempted: this.emailDeliveryStats.attempted,
      pushDelivery: 'not_implemented',
    };
  }
}
