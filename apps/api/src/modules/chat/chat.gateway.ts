import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

/**
 * WebSocket Gateway for Real-time Chat
 * 
 * Architecture:
 * - Database is the source of truth
 * - WebSocket only PUSHES events to connected clients
 * - All mutations go through REST API first
 * 
 * Events:
 * - new_message: Pushed when a new message is created via REST
 * - message_read: Pushed when messages are marked as read
 * - typing: Pushed when user is typing
 * 
 * Authentication:
 * - JWT token passed in handshake auth or query
 * - Validated on connection, socket.data.user populated
 * 
 * Rooms:
 * - Each conversation has a room: conversation:{conversationId}
 * - Users join rooms for their conversations
 */
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin:
      process.env.WEB_URL ||
      process.env.PUBLIC_APP_URL ||
      'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // Map of userId -> socketId for direct messaging
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
  ) {}

  // ============================================
  // Connection Lifecycle
  // ============================================

  async handleConnection(socket: Socket) {
    try {
      // Extract token from auth header or query
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        socket.disconnect();
        return;
      }

      // Verify JWT
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Attach user to socket
      socket.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      // Track user's sockets
      const userId = payload.sub;
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Auto-join user's conversation rooms
      await this.joinUserConversations(socket, userId);

      this.logger.log(`User ${userId} connected via socket ${socket.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Connection rejected: Invalid token - ${errorMessage}`);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    const userId = socket.data.user?.id;
    if (userId) {
      this.userSockets.get(userId)?.delete(socket.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
      this.logger.log(`User ${userId} disconnected from socket ${socket.id}`);
    }
  }

  private async joinUserConversations(socket: Socket, userId: string) {
    // Get user's conversations and join their rooms
    const conversations = await this.chatService.getUserConversations(userId, 100, 0);
    
    for (const conv of conversations) {
      socket.join(`conversation:${conv.id}`);
    }

    this.logger.debug(`User ${userId} joined ${conversations.length} conversation rooms`);
  }

  // ============================================
  // Client -> Server Events
  // ============================================

  /**
   * Join a specific conversation room
   */
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = socket.data.user?.id;
    if (!userId) throw new WsException('Unauthorized');

    // Verify user is part of conversation
    try {
      await this.chatService.getConversationDetails(userId, data.conversationId);
      socket.join(`conversation:${data.conversationId}`);
      return { success: true, room: `conversation:${data.conversationId}` };
    } catch (error) {
      throw new WsException('Access denied to conversation');
    }
  }

  /**
   * Leave a conversation room
   */
  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    socket.leave(`conversation:${data.conversationId}`);
    return { success: true };
  }

  /**
   * Typing indicator
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    const userId = socket.data.user?.id;
    if (!userId) throw new WsException('Unauthorized');

    // Broadcast to conversation room (except sender)
    socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId,
      isTyping: data.isTyping,
    });

    return { success: true };
  }

  /**
   * Mark messages as read
   */
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = socket.data.user?.id;
    if (!userId) throw new WsException('Unauthorized');

    const result = await this.chatService.markAsRead(userId, data.conversationId);

    // Notify other users in conversation
    socket.to(`conversation:${data.conversationId}`).emit('messages_read', {
      conversationId: data.conversationId,
      readBy: userId,
      count: result.markedAsRead,
    });

    return { success: true, ...result };
  }

  // ============================================
  // Server -> Client Pushes (called from service)
  // ============================================

  /**
   * Push new message to conversation participants
   * Called from ChatService after message is saved to DB
   */
  pushNewMessage(conversationId: string, message: any) {
    this.server.to(`conversation:${conversationId}`).emit('new_message', {
      conversationId,
      message,
    });
  }

  /**
   * Push notification to specific user
   */
  pushToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }
}
