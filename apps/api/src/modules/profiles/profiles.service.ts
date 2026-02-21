import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMentorProfileDto } from './dto/update-mentor-profile.dto';
import { UpdateMenteeProfileDto } from './dto/update-mentee-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getFullProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
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

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        fullName: true,
        timezone: true,
        role: true,
      },
    });
  }

  async getMentorProfile(userId: string) {
    const profile = await this.prisma.mentorProfile.findUnique({
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
            timezone: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Mentor profile not found');
    }

    return profile;
  }

  async updateMentorProfile(userId: string, dto: UpdateMentorProfileDto) {
    return this.prisma.mentorProfile.update({
      where: { userId },
      data: dto,
    });
  }

  async addMentorTopic(userId: string, topicId: string) {
    return this.prisma.mentorTopic.create({
      data: {
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
    return this.prisma.mentorProfile.update({
      where: { userId },
      data: { isActive },
    });
  }

  async getMenteeProfile(userId: string) {
    const profile = await this.prisma.menteeProfile.findUnique({
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

    if (!profile) {
      throw new NotFoundException('Mentee profile not found');
    }

    return profile;
  }

  async updateMenteeProfile(userId: string, dto: UpdateMenteeProfileDto) {
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
}
