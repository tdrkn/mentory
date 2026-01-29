import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingService } from './booking.service';
import { RedisLockService } from './redis-lock.service';
import { PrismaService } from '../../prisma';

describe('BookingService', () => {
  let service: BookingService;
  let prismaService: any;
  let redisLockService: any;

  const mockSlot = {
    id: 'slot-1',
    mentor_id: 'mentor-1',
    start_at: new Date('2026-02-01T10:00:00Z'),
    end_at: new Date('2026-02-01T11:00:00Z'),
    status: 'free',
    held_until: null,
  };

  const mockService = {
    id: 'service-1',
    mentorId: 'mentor-1',
    title: 'Mentoring Session',
    priceCents: 5000,
    currency: 'USD',
    isActive: true,
  };

  const mockSession = {
    id: 'session-1',
    mentorId: 'mentor-1',
    menteeId: 'mentee-1',
    slotId: 'slot-1',
    serviceId: 'service-1',
    status: 'requested',
    startAt: new Date('2026-02-01T10:00:00Z'),
    endAt: new Date('2026-02-01T11:00:00Z'),
    slot: {
      id: 'slot-1',
      status: 'held',
      heldUntil: new Date(Date.now() + 10 * 60 * 1000),
    },
  };

  beforeEach(async () => {
    // Mock Prisma transaction
    const mockTransaction = jest.fn((callback) => callback({
      $queryRaw: jest.fn(),
      slot: { update: jest.fn(), findMany: jest.fn() },
      session: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      mentorService: { findFirst: jest.fn() },
    }));

    prismaService = {
      $transaction: mockTransaction,
      slot: {
        update: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      session: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      mentorService: {
        findFirst: jest.fn(),
      },
    };

    redisLockService = {
      withLock: jest.fn(),
      acquireLock: jest.fn(),
      releaseLock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prismaService },
        { provide: RedisLockService, useValue: redisLockService },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  describe('holdSlot', () => {
    const holdDto = { slotId: 'slot-1', serviceId: 'service-1' };
    const menteeId = 'mentee-1';

    it('should successfully hold a free slot', async () => {
      // Arrange
      redisLockService.withLock.mockImplementation(async (slotId, callback) => {
        const result = await callback();
        return { success: true, result };
      });

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([mockSlot]),
          mentorService: { findFirst: jest.fn().mockResolvedValue(mockService) },
          slot: { update: jest.fn().mockResolvedValue({ ...mockSlot, status: 'held' }) },
          session: {
            create: jest.fn().mockResolvedValue({
              ...mockSession,
              mentor: { id: 'mentor-1', fullName: 'Mentor', email: 'mentor@test.com' },
              service: mockService,
              slot: { id: 'slot-1', startAt: mockSlot.start_at, endAt: mockSlot.end_at },
            }),
          },
        };
        return callback(tx);
      });

      // Act
      const result = await service.holdSlot(menteeId, holdDto);

      // Assert
      expect(result.session).toBeDefined();
      expect(result.holdExpiresAt).toBeDefined();
      expect(result.holdDurationMinutes).toBe(10);
      expect(redisLockService.withLock).toHaveBeenCalledWith('slot-1', expect.any(Function));
    });

    it('should throw ConflictException on double hold (slot already held)', async () => {
      // Arrange - slot is already held by another user
      const heldSlot = {
        ...mockSlot,
        status: 'held',
        held_until: new Date(Date.now() + 5 * 60 * 1000), // 5 min remaining
      };

      redisLockService.withLock.mockImplementation(async (slotId, callback) => {
        try {
          await callback();
        } catch (error) {
          return { success: true, result: null, error: error.message };
        }
        return { success: true };
      });

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([heldSlot]),
          mentorService: { findFirst: jest.fn() },
          slot: { update: jest.fn() },
          session: { create: jest.fn() },
        };
        return callback(tx);
      });

      // Act & Assert
      await expect(service.holdSlot(menteeId, holdDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when Redis lock cannot be acquired', async () => {
      // Arrange - Another request is processing the same slot
      redisLockService.withLock.mockResolvedValue({
        success: false,
        error: 'Resource is currently locked. Please try again.',
      });

      // Act & Assert
      await expect(service.holdSlot(menteeId, holdDto)).rejects.toThrow(ConflictException);
    });

    it('should allow hold if previous hold has expired', async () => {
      // Arrange - slot was held but hold expired
      const expiredHoldSlot = {
        ...mockSlot,
        status: 'held',
        held_until: new Date(Date.now() - 1000), // Expired 1 second ago
      };

      redisLockService.withLock.mockImplementation(async (slotId, callback) => {
        const result = await callback();
        return { success: true, result };
      });

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([expiredHoldSlot]),
          mentorService: { findFirst: jest.fn().mockResolvedValue(mockService) },
          slot: { update: jest.fn().mockResolvedValue({ ...expiredHoldSlot, status: 'held' }) },
          session: {
            create: jest.fn().mockResolvedValue({
              ...mockSession,
              mentor: { id: 'mentor-1', fullName: 'Mentor', email: 'mentor@test.com' },
              service: mockService,
              slot: { id: 'slot-1', startAt: mockSlot.start_at, endAt: mockSlot.end_at },
            }),
          },
        };
        return callback(tx);
      });

      // Act
      const result = await service.holdSlot(menteeId, holdDto);

      // Assert
      expect(result.session).toBeDefined();
      expect(result.holdExpiresAt).toBeDefined();
    });

    it('should throw NotFoundException if slot does not exist', async () => {
      // Arrange
      redisLockService.withLock.mockImplementation(async (slotId, callback) => {
        try {
          await callback();
        } catch (error) {
          throw error;
        }
      });

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]), // No slot found
          mentorService: { findFirst: jest.fn() },
          slot: { update: jest.fn() },
          session: { create: jest.fn() },
        };
        return callback(tx);
      });

      // Act & Assert
      await expect(service.holdSlot(menteeId, holdDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if slot is already booked', async () => {
      // Arrange
      const bookedSlot = { ...mockSlot, status: 'booked' };

      redisLockService.withLock.mockImplementation(async (slotId, callback) => {
        try {
          await callback();
        } catch (error) {
          throw error;
        }
      });

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([bookedSlot]),
          mentorService: { findFirst: jest.fn() },
          slot: { update: jest.fn() },
          session: { create: jest.fn() },
        };
        return callback(tx);
      });

      // Act & Assert
      await expect(service.holdSlot(menteeId, holdDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('confirmSession', () => {
    const confirmDto = { sessionId: 'session-1' };
    const userId = 'mentor-1';

    it('should confirm a valid held session', async () => {
      // Arrange
      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          session: {
            findUnique: jest.fn().mockResolvedValue(mockSession),
            update: jest.fn().mockResolvedValue({
              ...mockSession,
              status: 'booked',
              mentor: { id: 'mentor-1', fullName: 'Mentor' },
              mentee: { id: 'mentee-1', fullName: 'Mentee' },
              service: mockService,
              slot: { ...mockSession.slot, status: 'booked' },
            }),
          },
          slot: {
            update: jest.fn().mockResolvedValue({ ...mockSession.slot, status: 'booked' }),
          },
        };
        return callback(tx);
      });

      // Act
      const result = await service.confirmSession(userId, confirmDto);

      // Assert
      expect(result.status).toBe('booked');
    });

    it('should throw BadRequestException if hold has expired', async () => {
      // Arrange - hold expired
      const expiredSession = {
        ...mockSession,
        slot: {
          ...mockSession.slot,
          heldUntil: new Date(Date.now() - 1000), // Expired
        },
      };

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          session: {
            findUnique: jest.fn().mockResolvedValue(expiredSession),
            update: jest.fn().mockResolvedValue({ ...expiredSession, status: 'canceled' }),
          },
          slot: {
            update: jest.fn().mockResolvedValue({ ...expiredSession.slot, status: 'free' }),
          },
        };
        return callback(tx);
      });

      // Act & Assert
      await expect(service.confirmSession(userId, confirmDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if session does not exist', async () => {
      // Arrange
      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          session: {
            findUnique: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
          },
          slot: { update: jest.fn() },
        };
        return callback(tx);
      });

      // Act & Assert
      await expect(service.confirmSession(userId, confirmDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('releaseExpiredHolds', () => {
    it('should release expired held slots', async () => {
      // Arrange
      const expiredSlots = [
        {
          id: 'slot-1',
          status: 'held',
          heldUntil: new Date(Date.now() - 1000),
          session: [{ id: 'session-1', status: 'requested' }],
        },
        {
          id: 'slot-2',
          status: 'held',
          heldUntil: new Date(Date.now() - 2000),
          session: [],
        },
      ];

      prismaService.slot.findMany.mockResolvedValue(expiredSlots);
      prismaService.$transaction.mockResolvedValue([]);

      // Act
      const result = await service.releaseExpiredHolds();

      // Assert
      expect(result.released).toBe(2);
      expect(prismaService.slot.findMany).toHaveBeenCalledWith({
        where: {
          status: 'held',
          heldUntil: { lt: expect.any(Date) },
        },
        include: {
          session: { where: { status: 'requested' } },
        },
      });
    });
  });
});
