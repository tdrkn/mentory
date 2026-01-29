import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { ChatService } from './chat.service';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * GET /api/conversations
   * Get user's conversations
   * Access: Authenticated
   */
  @Get()
  async getConversations(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.chatService.getUserConversations(
      userId,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }

  /**
   * POST /api/conversations/:sessionId
   * Get or create conversation for session
   * Access: Session participant
   */
  @Post(':sessionId')
  async getOrCreateConversation(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.chatService.getOrCreateConversation(userId, sessionId);
  }

  /**
   * GET /api/conversations/:id
   * Get conversation details
   * Access: Conversation participant
   */
  @Get(':id')
  async getConversation(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.chatService.getConversationDetails(userId, conversationId);
  }

  /**
   * GET /api/conversations/:id/messages
   * Get conversation messages
   * Access: Conversation participant
   */
  @Get(':id/messages')
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.chatService.getMessages(
      userId,
      conversationId,
      limit ? parseInt(limit) : 50,
      before,
    );
  }
}
