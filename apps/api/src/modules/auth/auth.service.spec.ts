import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma';
import { EmailService } from '../notifications/email.service';

describe('AuthService', () => {
  let service: AuthService;

  const txUserCreate = jest.fn();
  const txUserAgreementCreate = jest.fn();
  const userUpdate = jest.fn();

  const mockPrismaService = {
    $transaction: jest.fn(),
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: userUpdate,
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  beforeEach(async () => {
    mockPrismaService.$transaction.mockImplementation(async (handler: any) =>
      handler({
        user: {
          create: txUserCreate,
        },
        userAgreement: {
          create: txUserAgreementCreate,
        },
      }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      username: 'test_user',
      password: 'password123',
      fullName: 'Test User',
      role: 'mentee' as const,
      termsAccepted: true,
    };

    it('should register a new user and require email verification', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      txUserCreate.mockResolvedValue({
        id: 'user-id',
        email: registerDto.email,
        username: registerDto.username,
        fullName: registerDto.fullName,
        role: registerDto.role,
        createdAt: new Date(),
      });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('requiresEmailVerification', true);
      expect(result.user.email).toBe(registerDto.email);
      expect(result.user.username).toBe(registerDto.username);
      expect(txUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: registerDto.email,
            username: registerDto.username,
            fullName: registerDto.fullName,
            isEmailVerified: false,
          }),
        }),
      );
      expect(txUserAgreementCreate).toHaveBeenCalled();
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        email: registerDto.email,
        username: 'another_username',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('validateUser', () => {
    const login = 'test@example.com';
    const password = 'password123';

    it('should return user if credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash(password, 10);
      const mockUser = {
        id: 'user-id',
        email: login,
        username: 'test_user',
        passwordHash: hashedPassword,
        fullName: 'Test User',
        role: 'mentee',
        isBlocked: false,
        isEmailVerified: true,
        failedLoginAttempts: 0,
        loginLockedUntil: null,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.validateUser(login, password);

      expect(result).toBeDefined();
      expect(result?.email).toBe(login);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.validateUser(login, password)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is blocked', async () => {
      const hashedPassword = await bcrypt.hash(password, 10);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-id',
        email: login,
        passwordHash: hashedPassword,
        isBlocked: true,
        isEmailVerified: true,
        failedLoginAttempts: 0,
        loginLockedUntil: null,
      });

      await expect(service.validateUser(login, password)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account email is not verified', async () => {
      const hashedPassword = await bcrypt.hash(password, 10);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-id',
        email: login,
        passwordHash: hashedPassword,
        isBlocked: false,
        isEmailVerified: false,
        failedLoginAttempts: 0,
        loginLockedUntil: null,
      });

      await expect(service.validateUser(login, password)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const hashedPassword = await bcrypt.hash('different-password', 10);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-id',
        email: login,
        passwordHash: hashedPassword,
        isBlocked: false,
        isEmailVerified: true,
        failedLoginAttempts: 0,
        loginLockedUntil: null,
      });

      await expect(service.validateUser(login, password)).rejects.toThrow(UnauthorizedException);
      expect(userUpdate).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: {
          failedLoginAttempts: 1,
          loginLockedUntil: null,
        },
      });
    });

    it('should lock form for 15 minutes on 5th failed attempt', async () => {
      const hashedPassword = await bcrypt.hash('different-password', 10);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-id',
        email: login,
        passwordHash: hashedPassword,
        isBlocked: false,
        isEmailVerified: true,
        failedLoginAttempts: 4,
        loginLockedUntil: null,
      });

      await expect(service.validateUser(login, password)).rejects.toThrow(UnauthorizedException);
      expect(userUpdate).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: {
          failedLoginAttempts: 0,
          loginLockedUntil: expect.any(Date),
        },
      });
    });

    it('should throw UnauthorizedException if login is temporarily locked', async () => {
      const hashedPassword = await bcrypt.hash(password, 10);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-id',
        email: login,
        passwordHash: hashedPassword,
        isBlocked: false,
        isEmailVerified: true,
        failedLoginAttempts: 0,
        loginLockedUntil: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(service.validateUser(login, password)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return user data with access token', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'test_user',
        fullName: 'Test User',
        role: 'mentee',
      };

      const result = await service.login(mockUser as any, '::ffff:127.0.0.1');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.username).toBe(mockUser.username);
      expect(userUpdate).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          lastLoginAt: expect.any(Date),
          lastLoginIp: '127.0.0.1',
        }),
      });
      expect(mockJwtService.sign).toHaveBeenCalled();
    });
  });
});
