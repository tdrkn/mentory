import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { PrismaService } from '../../prisma';

describe('ProfilesService', () => {
  let service: ProfilesService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    mentorProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    menteeProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    mentorTopic: {
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: PrismaService, useValue: mockPrismaService },
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
        goals: 'Learn programming',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          fullName: 'Test User',
        },
      };

      mockPrismaService.menteeProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getMenteeProfile('user-id');

      expect(result).toEqual(mockProfile);
      expect(result.goals).toBe('Learn programming');
    });

    it('should throw NotFoundException if mentee profile not found', async () => {
      mockPrismaService.menteeProfile.findUnique.mockResolvedValue(null);

      await expect(service.getMenteeProfile('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
