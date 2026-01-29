// ============================================
// Notifications Module - In-App + Email via BullMQ
// ============================================
// Tables: notifications
// Queue: email-notifications (BullMQ)
// Email: Nodemailer → Mailhog (dev) / SMTP (prod)

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailProcessor } from './processors/email.processor';
import { EmailService } from './email.service';

export const NOTIFICATION_QUEUE = 'notifications';
export const EMAIL_QUEUE = 'email';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: NOTIFICATION_QUEUE },
      { name: EMAIL_QUEUE },
    ),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailProcessor, EmailService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
