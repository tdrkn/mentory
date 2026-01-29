import { Test, TestingModule } from '@nestjs/testing';
import { EmailProcessor, EmailJobData } from './email.processor';
import { EmailService } from '../email.service';
import { Job } from 'bull';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let emailService: EmailService;

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
    emailService = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  const createMockJob = (data: EmailJobData): Job<EmailJobData> => ({
    id: 'test-job-1',
    data,
  } as Job<EmailJobData>);

  describe('handleSendEmail', () => {
    it('should send email successfully', async () => {
      mockEmailService.sendEmail.mockResolvedValue(true);

      const job = createMockJob({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test body</p>',
      });

      const result = await processor.handleSendEmail(job);

      expect(result.success).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test body</p>',
      });
    });

    it('should throw error on failure for retry', async () => {
      mockEmailService.sendEmail.mockRejectedValue(new Error('SMTP error'));

      const job = createMockJob({
        to: 'user@example.com',
        subject: 'Test',
      });

      await expect(processor.handleSendEmail(job)).rejects.toThrow('SMTP error');
    });
  });

  describe('handleSessionBooked', () => {
    it('should send session_booked email with correct template', async () => {
      mockEmailService.sendEmail.mockResolvedValue(true);

      const job = createMockJob({
        to: 'mentor@example.com',
        userId: 'mentor-123',
        context: {
          mentorName: 'John Mentor',
          menteeName: 'Jane Mentee',
          sessionDate: '15.01.2024',
          sessionTime: '10:00',
          topic: 'JavaScript',
          sessionLink: 'http://localhost:3000/sessions/123',
        },
      });

      const result = await processor.handleSessionBooked(job);

      expect(result.success).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
        to: 'mentor@example.com',
        subject: '🎉 Новая сессия забронирована!',
        template: 'session_booked',
        context: job.data.context,
      });
    });
  });

  describe('handlePaymentReceived', () => {
    it('should send payment_received email', async () => {
      mockEmailService.sendEmail.mockResolvedValue(true);

      const job = createMockJob({
        to: 'mentor@example.com',
        userId: 'mentor-123',
        context: {
          mentorName: 'John Mentor',
          menteeName: 'Jane Mentee',
          amount: '50.00',
          currency: 'USD',
          sessionDate: '15.01.2024',
        },
      });

      const result = await processor.handlePaymentReceived(job);

      expect(result.success).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'payment_received',
          subject: '💰 Оплата получена',
        }),
      );
    });
  });

  describe('handleNewMessage', () => {
    it('should send new_message email with sender name in subject', async () => {
      mockEmailService.sendEmail.mockResolvedValue(true);

      const job = createMockJob({
        to: 'recipient@example.com',
        userId: 'user-123',
        context: {
          senderName: 'John Sender',
          recipientName: 'Jane Recipient',
          messagePreview: 'Hello, how are you?',
          conversationLink: 'http://localhost:3000/chat/123',
        },
      });

      const result = await processor.handleNewMessage(job);

      expect(result.success).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '💬 Новое сообщение от John Sender',
          template: 'new_message',
        }),
      );
    });

    it('should use fallback when senderName is missing', async () => {
      mockEmailService.sendEmail.mockResolvedValue(true);

      const job = createMockJob({
        to: 'recipient@example.com',
        userId: 'user-123',
        context: {},
      });

      await processor.handleNewMessage(job);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '💬 Новое сообщение от пользователя',
        }),
      );
    });
  });

  describe('handleSessionReminder', () => {
    it('should send session_reminder email', async () => {
      mockEmailService.sendEmail.mockResolvedValue(true);

      const job = createMockJob({
        to: 'user@example.com',
        userId: 'user-123',
        context: {
          userName: 'John User',
          partnerName: 'Jane Partner',
          timeLeft: '1 hour',
          topic: 'React',
          sessionLink: 'http://localhost:3000/sessions/123',
        },
      });

      const result = await processor.handleSessionReminder(job);

      expect(result.success).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'session_reminder',
          subject: '⏰ Напоминание о сессии',
        }),
      );
    });
  });
});
