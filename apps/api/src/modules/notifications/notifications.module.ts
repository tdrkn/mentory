// ============================================
// Notifications Module - In-App + Email via BullMQ
// ============================================
// Tables: notifications
// Delivery: in-app notifications plus direct SMTP email delivery
// Email: Nodemailer → Mailhog (dev) / SMTP (prod)

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';

export const NOTIFICATION_QUEUE = 'notifications';
export const EMAIL_QUEUE = 'email';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
