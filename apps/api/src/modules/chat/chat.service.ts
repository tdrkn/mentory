import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatGateway } from './chat.gateway';

const MAX_ATTACHMENT_SIZE_BYTES = 128 * 1024 * 1024;
const ALLOWED_DOCUMENT_EXTENSIONS = new Set(['.pptx', '.pdf', '.txt', '.mvd']);
const ALLOWED_CHAT_EMOJIS = new Set([
  '😀',
  '😂',
  '😊',
  '😍',
  '👍',
  '👏',
  '🔥',
  '💡',
  '🎉',
  '🙏',
  '🤝',
  '❤️',
]);

type MessageWithAttachments = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  contentType: string;
  isRead: boolean;
  createdAt: Date;
  readAt: Date | null;
  sender?: { id: string; fullName: string; avatarUrl: string | null };
  attachments?: Array<{
    id: string;
    messageId: string;
    filename: string;
    url: string;
    mimeType: string;
    sizeBytes: bigint | number;
  }>;
};

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

    // Check if conversation exists either by session or by participant pair
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { sessionId },
          { mentorId: session.mentorId, menteeId: session.menteeId },
        ],
      },
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
    } else if (conversation.sessionId !== sessionId) {
      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { sessionId },
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

    return messages.reverse().map((message) => this.serializeMessageForClient(message));
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

    const payload = this.validateAndNormalizeMessage(dto);

    const message = await this.prisma.$transaction(async (tx) => {
      // Create message
      const msg = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          content: payload.content,
          contentType: payload.contentType,
        },
        include: {
          sender: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      });

      // Create attachments if any
      if (payload.attachments.length) {
        await tx.attachment.createMany({
          data: payload.attachments.map((a) => ({
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

    const fullMessage = await this.prisma.message.findUnique({
      where: { id: message.id },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
        attachments: true,
      },
    });
    const serializedMessage = fullMessage ? this.serializeMessageForClient(fullMessage) : null;

    // Push message via WebSocket
    if (this.chatGateway && serializedMessage) {
      this.chatGateway.pushNewMessage(conversationId, serializedMessage);

      // Notify recipient if offline
      const recipientId = conversation.mentorId === userId 
        ? conversation.menteeId 
        : conversation.mentorId;
        
      // TODO: Queue notification for email if recipient is offline
    }

    return serializedMessage ?? message;
  }

  private serializeMessageForClient(message: MessageWithAttachments) {
    return {
      ...message,
      attachments: (message.attachments || []).map((attachment) => ({
        ...attachment,
        sizeBytes: Number(attachment.sizeBytes),
        size: Number(attachment.sizeBytes),
      })),
    };
  }

  private validateAndNormalizeMessage(dto: SendMessageDto) {
    const contentType = dto.contentType || 'text';
    const content = dto.content?.trim() || '';
    const attachments = dto.attachments || [];

    for (const attachment of attachments) {
      if (attachment.size < 1 || attachment.size > MAX_ATTACHMENT_SIZE_BYTES) {
        throw new BadRequestException('Attachment size must be between 1 byte and 128MB');
      }
    }

    switch (contentType) {
      case 'text': {
        if (!content) {
          throw new BadRequestException('Text message cannot be empty');
        }
        if (attachments.length > 0) {
          throw new BadRequestException('Text message does not support attachments');
        }
        break;
      }
      case 'emoji': {
        if (!ALLOWED_CHAT_EMOJIS.has(content)) {
          throw new BadRequestException('Unsupported emoji');
        }
        if (attachments.length > 0) {
          throw new BadRequestException('Emoji message does not support attachments');
        }
        break;
      }
      case 'image': {
        if (attachments.length === 0) {
          throw new BadRequestException('Image message must include at least one attachment');
        }
        for (const attachment of attachments) {
          if (!attachment.mimeType.toLowerCase().startsWith('image/')) {
            throw new BadRequestException(`Unsupported image format: ${attachment.filename}`);
          }
        }
        break;
      }
      case 'file': {
        if (attachments.length === 0) {
          throw new BadRequestException('Document message must include at least one attachment');
        }
        for (const attachment of attachments) {
          const extension = this.getFileExtension(attachment.filename);
          if (!ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
            throw new BadRequestException(
              `Unsupported document format for ${attachment.filename}. Allowed: .pptx, .pdf, .txt, .mvd`,
            );
          }
        }
        break;
      }
      default:
        throw new BadRequestException('Unsupported message type');
    }

    return {
      contentType,
      content,
      attachments,
    };
  }

  private getFileExtension(filename: string) {
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex < 0) {
      return '';
    }
    return filename.slice(dotIndex).toLowerCase();
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
