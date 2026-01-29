import { Controller, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /api/chat/:conversationId/messages
   * Send message in conversation
   * Access: Conversation participant
   */
  @Post(':conversationId/messages')
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, conversationId, dto);
  }

  /**
   * PATCH /api/chat/:conversationId/read
   * Mark messages as read
   * Access: Conversation participant
   */
  @Patch(':conversationId/read')
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatService.markAsRead(userId, conversationId);
  }

  /**
   * POST /api/chat/:conversationId/typing
   * Send typing indicator
   * Access: Conversation participant
   */
  @Post(':conversationId/typing')
  async sendTypingIndicator(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    // TODO: Emit via WebSocket
    return { typing: true };
  }
}
