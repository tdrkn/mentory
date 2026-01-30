import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { SearchMentorsDto, MentorSortBy } from './dto/search-mentors.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search mentors with filters, sorting and pagination
   * 
   * Prisma Query Strategy:
   * 1. Build WHERE conditions dynamically
   * 2. Use subquery for price filtering (via mentorServices)
   * 3. Support multiple sort options with proper orderBy
   * 4. Pagination via limit/offset (simpler than cursor for this use case)
   */
  async searchMentors(query: SearchMentorsDto) {
    const {
      topic,
      topicSlug,
      language,
      minPrice,
      maxPrice,
      minRating,
      search,
      sort = MentorSortBy.RATING,
      limit = 20,
      offset = 0,
      page,
    } = query;

    // Calculate offset from page if provided
    const skip = page ? (page - 1) * limit : offset;

    // Build WHERE clause
    const where: Prisma.UserWhereInput = {
      role: { in: ['mentor', 'both'] },
      mentorProfile: {
        isActive: true,
        ...(minRating && { ratingAvg: { gte: minRating } }),
      },
    };

    // Topic filter - by name or slug
    if (topic || topicSlug) {
      (where.mentorProfile as any).topics = {
        some: {
          topic: topicSlug
            ? { slug: topicSlug }
            : { name: { contains: topic, mode: 'insensitive' } },
        },
      };
    }

    // Language filter
    if (language) {
      (where.mentorProfile as any).languages = { has: language };
    }

    // Price filter - check if mentor has at least one service in range
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.mentorServices = {
        some: {
          isActive: true,
          ...(minPrice !== undefined && { priceAmount: { gte: minPrice } }),
          ...(maxPrice !== undefined && { priceAmount: { lte: maxPrice } }),
        },
      };
    }

    // Full-text search
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { mentorProfile: { headline: { contains: search, mode: 'insensitive' } } },
        { mentorProfile: { bio: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Build ORDER BY based on sort parameter
    const orderBy = this.buildOrderBy(sort);

    // Execute query with count
    const [mentors, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          mentorProfile: {
            include: {
              topics: {
                include: {
                  topic: true,
                },
                take: 5, // Limit topics in list view
              },
            },
          },
          mentorServices: {
            where: { isActive: true },
            orderBy: { priceAmount: 'asc' },
            take: 1, // Show cheapest service
          },
          _count: {
            select: {
              sessionsAsMentor: { where: { status: 'completed' } },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    // Transform response
    const data = mentors.map((mentor: any) => ({
      id: mentor.id,
      fullName: mentor.fullName,
      avatarUrl: null, // TODO: Add avatarUrl to User model
      headline: mentor.mentorProfile?.headline,
      bio: mentor.mentorProfile?.bio?.substring(0, 200), // Truncate for list
      languages: mentor.mentorProfile?.languages || [],
      rating: {
        average: mentor.mentorProfile?.ratingAvg || 0,
        count: mentor.mentorProfile?.ratingCount || 0,
      },
      topics: mentor.mentorProfile?.topics?.map((t: any) => t.topic) || [],
      startingPrice: mentor.mentorServices?.[0] || null,
      completedSessions: mentor._count?.sessionsAsMentor || 0,
      joinedAt: mentor.createdAt,
    }));

    return {
      data,
      meta: {
        total,
        limit,
        offset: skip,
        hasMore: skip + mentors.length < total,
        // Also include page info if page was used
        ...(page && {
          page,
          totalPages: Math.ceil(total / limit),
        }),
      },
    };
  }

  private buildOrderBy(sort: MentorSortBy): Prisma.UserOrderByWithRelationInput[] {
    switch (sort) {
      case MentorSortBy.RATING:
        return [
          { mentorProfile: { ratingAvg: 'desc' } },
          { mentorProfile: { ratingCount: 'desc' } },
        ];
      case MentorSortBy.PRICE_ASC:
        // Note: Prisma doesn't support ordering by related aggregate directly
        // We'll order by rating as secondary, price filtering is done in WHERE
        return [{ mentorProfile: { ratingAvg: 'desc' } }];
      case MentorSortBy.PRICE_DESC:
        return [{ mentorProfile: { ratingAvg: 'desc' } }];
      case MentorSortBy.NEWEST:
        return [{ createdAt: 'desc' }];
      case MentorSortBy.SESSIONS:
        // Order by completed sessions count
        return [
          { sessionsAsMentor: { _count: 'desc' } },
          { mentorProfile: { ratingAvg: 'desc' } },
        ];
      default:
        return [{ mentorProfile: { ratingAvg: 'desc' } }];
    }
  }

  async getMentorPublicProfile(mentorId: string) {
    const mentor = await this.prisma.user.findFirst({
      where: {
        id: mentorId,
        role: { in: ['mentor', 'both'] },
        mentorProfile: { isActive: true },
      },
      select: {
        id: true,
        fullName: true,
        timezone: true,
        createdAt: true,
        mentorProfile: {
          select: {
            headline: true,
            bio: true,
            languages: true,
            ratingAvg: true,
            ratingCount: true,
            topics: {
              select: { topic: true },
            },
          },
        },
        mentorServices: {
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            durationMin: true,
            priceAmount: true,
            currency: true,
          },
        },
        _count: {
          select: { sessionsAsMentor: { where: { status: 'completed' } } },
        },
      },
    });

    if (!mentor) {
      throw new NotFoundException('Mentor not found');
    }

    return mentor;
  }

  async getMentorServices(mentorId: string) {
    return this.prisma.mentorService.findMany({
      where: { mentorId, isActive: true },
      orderBy: { priceAmount: 'asc' },
    });
  }

  async getMentorReviews(mentorId: string, page = 1, limit = 10) {
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { mentorId },
        include: {
          mentee: {
            select: { fullName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where: { mentorId } }),
    ]);

    return {
      data: reviews,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMentorAvailability(mentorId: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    return this.prisma.slot.findMany({
      where: {
        mentorId,
        status: 'free',
        startAt: { gte: fromDate, lte: toDate },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async getAllTopics() {
    return this.prisma.topic.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createTopic(dto: CreateTopicDto) {
    return this.prisma.topic.create({
      data: { name: dto.name },
    });
  }
}
