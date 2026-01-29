import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket, Server } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: ChatService;
  let jwtService: JwtService;

  const mockChatService = {
    getUserConversations: jest.fn(),
    getConversationDetails: jest.fn(),
    markAsRead: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: ChatService, useValue: mockChatService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    chatService = module.get<ChatService>(ChatService);
    jwtService = module.get<JwtService>(JwtService);

    // Mock server
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as unknown as Server;

    jest.clearAllMocks();
  });

  const createMockSocket = (overrides = {}): Socket => ({
    id: 'socket-123',
    handshake: {
      auth: { token: 'valid-token' },
      headers: {},
      query: {},
    },
    data: {},
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  } as unknown as Socket);

  describe('handleConnection', () => {
    it('should authenticate user and join conversation rooms', async () => {
      const socket = createMockSocket();
      
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user-123',
        email: 'user@test.com',
        role: 'mentee',
      });

      mockChatService.getUserConversations.mockResolvedValue([
        { id: 'conv-1' },
        { id: 'conv-2' },
      ]);

      await gateway.handleConnection(socket);

      expect(socket.data.user).toEqual({
        id: 'user-123',
        email: 'user@test.com',
        role: 'mentee',
      });
      expect(socket.join).toHaveBeenCalledWith('conversation:conv-1');
      expect(socket.join).toHaveBeenCalledWith('conversation:conv-2');
    });

    it('should disconnect socket without token', async () => {
      const socket = createMockSocket({
        handshake: { auth: {}, headers: {}, query: {} },
      });

      await gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('should disconnect socket with invalid token', async () => {
      const socket = createMockSocket();
      
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove user from online tracking', async () => {
      const socket = createMockSocket();
      socket.data.user = { id: 'user-123' };

      // First connect to add user
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });
      mockChatService.getUserConversations.mockResolvedValue([]);
      await gateway.handleConnection(socket);

      expect(gateway.isUserOnline('user-123')).toBe(true);

      // Then disconnect
      await gateway.handleDisconnect(socket);

      expect(gateway.isUserOnline('user-123')).toBe(false);
    });
  });

  describe('handleJoinConversation', () => {
    it('should join conversation room if user has access', async () => {
      const socket = createMockSocket();
      socket.data.user = { id: 'user-123' };

      mockChatService.getConversationDetails.mockResolvedValue({
        id: 'conv-123',
        mentorId: 'user-123',
      });

      const result = await gateway.handleJoinConversation(socket, {
        conversationId: 'conv-123',
      });

      expect(result.success).toBe(true);
      expect(socket.join).toHaveBeenCalledWith('conversation:conv-123');
    });

    it('should throw if user has no access', async () => {
      const socket = createMockSocket();
      socket.data.user = { id: 'user-123' };

      mockChatService.getConversationDetails.mockRejectedValue(
        new Error('Access denied'),
      );

      await expect(
        gateway.handleJoinConversation(socket, { conversationId: 'conv-123' }),
      ).rejects.toThrow('Access denied to conversation');
    });
  });

  describe('handleTyping', () => {
    it('should broadcast typing indicator to conversation', () => {
      const socket = createMockSocket();
      socket.data.user = { id: 'user-123' };

      const result = gateway.handleTyping(socket, {
        conversationId: 'conv-123',
        isTyping: true,
      });

      expect(result.success).toBe(true);
      expect(socket.to).toHaveBeenCalledWith('conversation:conv-123');
      expect(socket.emit).toHaveBeenCalledWith('user_typing', {
        conversationId: 'conv-123',
        userId: 'user-123',
        isTyping: true,
      });
    });
  });

  describe('handleMarkRead', () => {
    it('should mark messages as read and broadcast', async () => {
      const socket = createMockSocket();
      socket.data.user = { id: 'user-123' };

      mockChatService.markAsRead.mockResolvedValue({ markedAsRead: 5 });

      const result = await gateway.handleMarkRead(socket, {
        conversationId: 'conv-123',
      });

      expect(result.success).toBe(true);
      expect(result.markedAsRead).toBe(5);
      expect(socket.to).toHaveBeenCalledWith('conversation:conv-123');
      expect(socket.emit).toHaveBeenCalledWith('messages_read', {
        conversationId: 'conv-123',
        readBy: 'user-123',
        count: 5,
      });
    });
  });

  describe('pushNewMessage', () => {
    it('should emit new_message to conversation room', () => {
      const message = { id: 'msg-1', content: 'Hello' };

      gateway.pushNewMessage('conv-123', message);

      expect(gateway.server.to).toHaveBeenCalledWith('conversation:conv-123');
      expect(gateway.server.emit).toHaveBeenCalledWith('new_message', {
        conversationId: 'conv-123',
        message,
      });
    });
  });

  describe('isUserOnline', () => {
    it('should return true for connected user', async () => {
      const socket = createMockSocket();
      
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });
      mockChatService.getUserConversations.mockResolvedValue([]);

      await gateway.handleConnection(socket);

      expect(gateway.isUserOnline('user-123')).toBe(true);
    });

    it('should return false for disconnected user', () => {
      expect(gateway.isUserOnline('unknown-user')).toBe(false);
    });
  });

  describe('getOnlineUsersCount', () => {
    it('should return count of online users', async () => {
      const socket1 = createMockSocket({ id: 'socket-1' });
      const socket2 = createMockSocket({ id: 'socket-2' });

      mockJwtService.verifyAsync
        .mockResolvedValueOnce({ sub: 'user-1' })
        .mockResolvedValueOnce({ sub: 'user-2' });
      mockChatService.getUserConversations.mockResolvedValue([]);

      await gateway.handleConnection(socket1);
      await gateway.handleConnection(socket2);

      expect(gateway.getOnlineUsersCount()).toBe(2);
    });
  });
});
