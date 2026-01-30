import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  private chatGateway: ChatGateway | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Set gateway reference (called after module init to avoid circular dep)
   */
  setChatGateway(gateway: ChatGateway) {
    this.chatGateway = gateway;
  }

  async getUserConversations(userId: string, limit: number, offset: number) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ mentorId: userId }, { menteeId: userId }],
      },
      include: {
        mentor: { select: { id: true, fullName: true, avatarUrl: true } },
        mentee: { select: { id: true, fullName: true, avatarUrl: true } },
        session: {
          select: { id: true, startAt: true, status: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { id: true, content: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Get unread counts
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            isRead: false,
          },
        });

        return {
          ...conv,
          lastMessage: conv.messages[0] || null,
          unreadCount,
        };
      }),
    );

    return conversationsWithUnread;
  }

  async getOrCreateConversation(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        OR: [{ mentorId: userId }, { menteeId: userId }],
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Check if conversation exists
    let conversation = await this.prisma.conversation.findUnique({
      where: { sessionId },
      include: {
        mentor: { select: { id: true, fullName: true, avatarUrl: true } },
        mentee: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          sessionId,
          mentorId: session.mentorId,
          menteeId: session.menteeId,
        },
        include: {
          mentor: { select: { id: true, fullName: true, avatarUrl: true } },
          mentee: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      });
    }

    return conversation;
  }

  async getConversationDetails(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        mentor: { select: { id: true, fullName: true, avatarUrl: true } },
        mentee: { select: { id: true, fullName: true, avatarUrl: true } },
        session: {
          select: { id: true, startAt: true, endAt: true, status: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.mentorId !== userId && conversation.menteeId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return conversation;
  }

  async getMessages(userId: string, conversationId: string, limit: number, before?: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ mentorId: userId }, { menteeId: userId }],
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const where: any = { conversationId };

    if (before) {
      const beforeMessage = await this.prisma.message.findUnique({
        where: { id: before },
      });
      if (beforeMessage) {
        where.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse(); // Return in chronological order
  }

  async sendMessage(userId: string, conversationId: string, dto: SendMessageDto) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ mentorId: userId }, { menteeId: userId }],
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const message = await this.prisma.$transaction(async (tx) => {
      // Create message
      const msg = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          content: dto.content,
          contentType: dto.contentType || 'text',
        },
        include: {
          sender: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      });

      // Create attachments if any
      if (dto.attachments?.length) {
        await tx.attachment.createMany({
          data: dto.attachments.map((a) => ({
            messageId: msg.id,
            filename: a.filename,
            mimeType: a.mimeType,
            url: a.url,
            sizeBytes: a.size,
          })),
        });
      }

      // Update conversation timestamp
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return msg;
    });

    // Push message via WebSocket
    if (this.chatGateway) {
      // Get full message with attachments
      const fullMessage = await this.prisma.message.findUnique({
        where: { id: message.id },
        include: {
          sender: { select: { id: true, fullName: true, avatarUrl: true } },
          attachments: true,
        },
      });
      
      this.chatGateway.pushNewMessage(conversationId, fullMessage);
      
      // Notify recipient if offline
      const recipientId = conversation.mentorId === userId 
        ? conversation.menteeId 
        : conversation.mentorId;
        
      // TODO: Queue notification for email if recipient is offline
    }

    return message;
  }

  async markAsRead(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ mentorId: userId }, { menteeId: userId }],
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return { markedAsRead: result.count };
  }
}
