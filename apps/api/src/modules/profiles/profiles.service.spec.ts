import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { PrismaService } from '../../prisma';
import { FileStorageService } from '../../common/file-storage.service';

describe('ProfilesService', () => {
  let service: ProfilesService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    mentorProfile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    menteeProfile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    mentorTopic: {
      create: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)),
  };
  const mockFileStorageService = {
    storeDataUrlIfNeeded: jest.fn((fileUrl: string) => Promise.resolve(fileUrl)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FileStorageService, useValue: mockFileStorageService },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);

    jest.clearAllMocks();
  });

  describe('getFullProfile', () => {
    it('should return user with mentor and mentee profiles', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'mentor',
        mentorProfile: {
          userId: 'user-id',
          headline: 'Senior Developer',
          topics: [],
        },
        menteeProfile: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getFullProfile('user-id');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getFullProfile('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create missing mentor profile for mentor users', async () => {
      const userWithoutProfile = {
        id: 'user-id',
        email: 'mentor@example.com',
        fullName: 'Mentor User',
        role: 'mentor',
        mentorProfile: null,
        menteeProfile: null,
      };
      const userWithProfile = {
        ...userWithoutProfile,
        mentorProfile: { userId: 'user-id', topics: [] },
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(userWithoutProfile)
        .mockResolvedValueOnce({ id: 'user-id' })
        .mockResolvedValueOnce(userWithProfile);
      mockPrismaService.mentorProfile.upsert.mockResolvedValue({ userId: 'user-id' });

      const result = await service.getFullProfile('user-id');

      expect(result).toEqual(userWithProfile);
      expect(mockPrismaService.mentorProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        update: {},
        create: {
          userId: 'user-id',
          timezone: 'Europe/Moscow',
          verificationStatus: 'unverified',
          isActive: false,
        },
      });
    });
  });

  describe('updateMentorProfile', () => {
    it('should update mentor profile with dto', async () => {
      const updateDto = {
        headline: 'Updated Headline',
        hourlyRateCents: 10000,
      };

      mockPrismaService.mentorProfile.update.mockResolvedValue({
        userId: 'user-id',
        ...updateDto,
      });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-id' });
      mockPrismaService.mentorProfile.upsert.mockResolvedValue({ userId: 'user-id' });

      const result = await service.updateMentorProfile('user-id', updateDto);

      expect(result.headline).toBe(updateDto.headline);
      expect(mockPrismaService.mentorProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        data: updateDto,
      });
    });
  });

  describe('getMenteeProfile', () => {
    it('should return mentee profile with user data', async () => {
      const mockProfile = {
        userId: 'user-id',
        goals: ['Learn programming'],
        user: {
          id: 'user-id',
          email: 'test@example.com',
          fullName: 'Test User',
        },
      };

      mockPrismaService.menteeProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-id' });
      mockPrismaService.menteeProfile.upsert.mockResolvedValue({ userId: 'user-id' });

      const result = await service.getMenteeProfile('user-id');

      expect(result).toEqual(mockProfile);
      expect(result.goals).toContain('Learn programming');
    });

    it('should create missing mentee profile before reading it', async () => {
      mockPrismaService.menteeProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-id' });
      mockPrismaService.menteeProfile.upsert.mockResolvedValue({ userId: 'user-id' });

      await expect(service.getMenteeProfile('user-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.menteeProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        update: {},
        create: { userId: 'user-id' },
      });
    });
  });
});
