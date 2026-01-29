import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  context?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 1025), // Mailhog default
      secure: false, // Mailhog doesn't use TLS
      auth: this.config.get<string>('SMTP_USER')
        ? {
            user: this.config.get<string>('SMTP_USER'),
            pass: this.config.get<string>('SMTP_PASS'),
          }
        : undefined,
    });
  }

  async sendEmail(payload: EmailPayload): Promise<boolean> {
    try {
      const html = payload.html || this.renderTemplate(payload.template, payload.context);

      const result = await this.transporter.sendMail({
        from: this.config.get<string>('EMAIL_FROM', 'noreply@mentory.local'),
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html,
      });

      this.logger.log(`Email sent to ${payload.to}: ${result.messageId}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email to ${payload.to}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Simple template renderer - replace {{key}} with context values
   */
  private renderTemplate(templateName?: string, context?: Record<string, any>): string {
    if (!templateName) return '';

    const template = this.getTemplate(templateName);
    if (!template) return '';

    let html = template;
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }
    }

    return html;
  }

  private getTemplate(name: string): string {
    const templates: Record<string, string> = {
      session_booked: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Mentory</h1>
            </div>
            <div class="content">
              <h2>Новая сессия забронирована!</h2>
              <p>Привет, {{mentorName}}!</p>
              <p>{{menteeName}} забронировал(а) сессию с вами.</p>
              <p><strong>Дата:</strong> {{sessionDate}}</p>
              <p><strong>Время:</strong> {{sessionTime}}</p>
              <p><strong>Тема:</strong> {{topic}}</p>
              <a href="{{sessionLink}}" class="button">Посмотреть детали</a>
            </div>
            <div class="footer">
              <p>© 2024 Mentory. Все права защищены.</p>
            </div>
          </div>
        </body>
        </html>
      `,

      payment_received: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .amount { font-size: 32px; font-weight: bold; color: #059669; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Оплата получена</h1>
            </div>
            <div class="content">
              <p>Привет, {{mentorName}}!</p>
              <p>Вы получили оплату за сессию с {{menteeName}}.</p>
              <p class="amount">{{amount}} {{currency}}</p>
              <p><strong>Дата сессии:</strong> {{sessionDate}}</p>
            </div>
            <div class="footer">
              <p>© 2024 Mentory. Все права защищены.</p>
            </div>
          </div>
        </body>
        </html>
      `,

      new_message: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .message-box { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5; }
            .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💬 Новое сообщение</h1>
            </div>
            <div class="content">
              <p>Привет, {{recipientName}}!</p>
              <p>{{senderName}} отправил(а) вам сообщение:</p>
              <div class="message-box">
                <p>{{messagePreview}}</p>
              </div>
              <br>
              <a href="{{conversationLink}}" class="button">Открыть чат</a>
            </div>
            <div class="footer">
              <p>© 2024 Mentory. Все права защищены.</p>
              <p><a href="{{unsubscribeLink}}">Отписаться от уведомлений</a></p>
            </div>
          </div>
        </body>
        </html>
      `,

      session_reminder: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .timer { font-size: 24px; font-weight: bold; color: #f59e0b; }
            .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Напоминание о сессии</h1>
            </div>
            <div class="content">
              <p>Привет, {{userName}}!</p>
              <p>Ваша сессия начнется через:</p>
              <p class="timer">{{timeLeft}}</p>
              <p><strong>С:</strong> {{partnerName}}</p>
              <p><strong>Тема:</strong> {{topic}}</p>
              <a href="{{sessionLink}}" class="button">Присоединиться</a>
            </div>
            <div class="footer">
              <p>© 2024 Mentory. Все права защищены.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    return templates[name] || '';
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`SMTP connection failed: ${errorMessage}`);
      return false;
    }
  }
}
