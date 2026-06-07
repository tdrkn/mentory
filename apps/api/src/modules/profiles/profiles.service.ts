import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMentorProfileDto } from './dto/update-mentor-profile.dto';
import { UpdateMenteeProfileDto } from './dto/update-mentee-profile.dto';
import { FileStorageService } from '../../common/file-storage.service';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorage: FileStorageService,
  ) {}

  async getFullProfile(userId: string) {
    const user = await this.getUserWithProfiles(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if ((user.role === 'mentor' || user.role === 'both') && !user.mentorProfile) {
      await this.ensureMentorProfile(userId);
    }

    if ((user.role === 'mentee' || user.role === 'both') && !user.menteeProfile) {
      await this.ensureMenteeProfile(userId);
    }

    if (
      ((user.role === 'mentor' || user.role === 'both') && !user.mentorProfile) ||
      ((user.role === 'mentee' || user.role === 'both') && !user.menteeProfile)
    ) {
      return this.getUserWithProfiles(userId);
    }

    return user;
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const { avatarFileName, avatarMimeType, avatarSize, firstName, lastName, ...data } = dto;

    if (data.avatarUrl) {
      data.avatarUrl = await this.fileStorage.storeDataUrlIfNeeded(data.avatarUrl, {
        scope: 'avatars',
        fileName: avatarFileName || 'avatar.png',
        mimeType: avatarMimeType || 'image/png',
        sizeBytes: avatarSize,
      });
    }

    // If firstName/lastName provided, recompute fullName
    if (firstName !== undefined || lastName !== undefined) {
      const current = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      const fn = (firstName ?? current?.firstName ?? '').trim();
      const ln = (lastName ?? current?.lastName ?? '').trim();
      const computed = [fn, ln].filter(Boolean).join(' ');
      if (computed) data.fullName = computed;
      (data as any).firstName = fn || null;
      (data as any).lastName = ln || null;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        timezone: true,
        role: true,
      },
    });
  }

  async getMentorProfile(userId: string) {
    await this.ensureMentorProfile(userId);
    const profile = await this.findMentorProfile(userId);

    if (!profile) {
      throw new NotFoundException('Mentor profile not found');
    }

    return profile;
  }

  async updateMentorProfile(userId: string, dto: UpdateMentorProfileDto) {
    const data = {
      ...dto,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : dto.birthDate,
    };

    await this.ensureMentorProfile(userId);
    return this.prisma.mentorProfile.update({
      where: { userId },
      data,
    });
  }

  async addMentorTopic(userId: string, topicId: string) {
    await this.ensureMentorProfile(userId);
    return this.prisma.mentorTopic.upsert({
      where: {
        mentorId_topicId: {
          mentorId: userId,
          topicId,
        },
      },
      update: {},
      create: {
        mentorId: userId,
        topicId,
      },
      include: { topic: true },
    });
  }

  async removeMentorTopic(userId: string, topicId: string) {
    return this.prisma.mentorTopic.delete({
      where: {
        mentorId_topicId: {
          mentorId: userId,
          topicId,
        },
      },
    });
  }

  async setMentorTopics(userId: string, topicIds: string[]) {
    await this.ensureMentorProfile(userId);
    // Transaction: delete all, then create new
    await this.prisma.$transaction([
      this.prisma.mentorTopic.deleteMany({
        where: { mentorId: userId },
      }),
      this.prisma.mentorTopic.createMany({
        data: topicIds.map((topicId) => ({
          mentorId: userId,
          topicId,
        })),
      }),
    ]);

    // Return updated topics
    return this.prisma.mentorTopic.findMany({
      where: { mentorId: userId },
      include: { topic: true },
    });
  }

  async setMentorActive(userId: string, isActive: boolean) {
    await this.ensureMentorProfile(userId);
    return this.prisma.mentorProfile.update({
      where: { userId },
      data: { isActive },
    });
  }

  async getMenteeProfile(userId: string) {
    await this.ensureMenteeProfile(userId);
    const profile = await this.findMenteeProfile(userId);

    if (!profile) {
      throw new NotFoundException('Mentee profile not found');
    }

    return profile;
  }

  async updateMenteeProfile(userId: string, dto: UpdateMenteeProfileDto) {
    await this.ensureMenteeProfile(userId);
    return this.prisma.menteeProfile.update({
      where: { userId },
      data: dto,
    });
  }

  async getMenteeProfileForMentor(mentorId: string, menteeId: string) {
    const hasSharedSession = await this.prisma.session.findFirst({
      where: {
        mentorId,
        menteeId,
      },
      select: { id: true },
    });

    if (!hasSharedSession) {
      throw new NotFoundException('Mentee not found');
    }

    const profile = await this.prisma.menteeProfile.findUnique({
      where: { userId: menteeId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            timezone: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Mentee profile not found');
    }

    return profile;
  }

  private getUserWithProfiles(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        mentorProfile: {
          include: {
            topics: {
              include: { topic: true },
            },
          },
        },
        menteeProfile: true,
      },
    });
  }

  private findMentorProfile(userId: string) {
    return this.prisma.mentorProfile.findUnique({
      where: { userId },
      include: {
        topics: {
          include: { topic: true },
        },
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            timezone: true,
          },
        },
      },
    });
  }

  private findMenteeProfile(userId: string) {
    return this.prisma.menteeProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            timezone: true,
          },
        },
      },
    });
  }

  private async ensureMentorProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.mentorProfile.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        timezone: 'Europe/Moscow',
        verificationStatus: 'unverified',
        isActive: false,
      },
    });
  }

  private async ensureMenteeProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.menteeProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }
}
