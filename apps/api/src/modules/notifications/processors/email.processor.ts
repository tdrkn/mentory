import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EMAIL_QUEUE } from '../notifications.module';
import { EmailService, EmailPayload } from '../email.service';

export interface EmailJobData extends EmailPayload {
  userId?: string;
  notificationType?: string;
}

@Processor(EMAIL_QUEUE)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process('send')
  async handleSendEmail(job: Job<EmailJobData>) {
    this.logger.log(`Processing email job ${job.id} to ${job.data.to}`);

    try {
      await this.emailService.sendEmail(job.data);
      this.logger.log(`Email job ${job.id} completed successfully`);
      return { success: true, messageId: job.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Email job ${job.id} failed: ${errorMessage}`);
      throw error; // Bull will retry based on job options
    }
  }

  @Process('session_booked')
  async handleSessionBooked(job: Job<EmailJobData>) {
    this.logger.log(`Processing session_booked email for user ${job.data.userId}`);
    
    const emailPayload: EmailPayload = {
      to: job.data.to,
      subject: '🎉 Новая сессия забронирована!',
      template: 'session_booked',
      context: job.data.context,
    };

    try {
      await this.emailService.sendEmail(emailPayload);
      return { success: true };
    } catch (error) {
      this.logger.error(`session_booked email failed: ${error.message}`);
      throw error;
    }
  }

  @Process('payment_received')
  async handlePaymentReceived(job: Job<EmailJobData>) {
    this.logger.log(`Processing payment_received email for user ${job.data.userId}`);
    
    const emailPayload: EmailPayload = {
      to: job.data.to,
      subject: '💰 Оплата получена',
      template: 'payment_received',
      context: job.data.context,
    };

    try {
      await this.emailService.sendEmail(emailPayload);
      return { success: true };
    } catch (error) {
      this.logger.error(`payment_received email failed: ${error.message}`);
      throw error;
    }
  }

  @Process('new_message')
  async handleNewMessage(job: Job<EmailJobData>) {
    this.logger.log(`Processing new_message email for user ${job.data.userId}`);
    
    const emailPayload: EmailPayload = {
      to: job.data.to,
      subject: `💬 Новое сообщение от ${job.data.context?.senderName || 'пользователя'}`,
      template: 'new_message',
      context: job.data.context,
    };

    try {
      await this.emailService.sendEmail(emailPayload);
      return { success: true };
    } catch (error) {
      this.logger.error(`new_message email failed: ${error.message}`);
      throw error;
    }
  }

  @Process('session_reminder')
  async handleSessionReminder(job: Job<EmailJobData>) {
    this.logger.log(`Processing session_reminder email for user ${job.data.userId}`);
    
    const emailPayload: EmailPayload = {
      to: job.data.to,
      subject: '⏰ Напоминание о сессии',
      template: 'session_reminder',
      context: job.data.context,
    };

    try {
      await this.emailService.sendEmail(emailPayload);
      return { success: true };
    } catch (error) {
      this.logger.error(`session_reminder email failed: ${error.message}`);
      throw error;
    }
  }
}
