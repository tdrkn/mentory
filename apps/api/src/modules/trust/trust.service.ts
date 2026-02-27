import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { AddComplaintMessageDto } from './dto/add-complaint-message.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { UploadRegaliaDto } from './dto/upload-regalia.dto';
import { ReviewRegaliaDto } from './dto/review-regalia.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { CreateModerationActionDto } from './dto/create-moderation-action.dto';
import { CreatePlatformWithdrawalDto } from './dto/create-platform-withdrawal.dto';

const MAX_UPLOAD_SIZE_BYTES = 128 * 1024 * 1024;
const ALLOWED_COMPLAINT_ATTACHMENT_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.pdf']);
const ALLOWED_COMPLAINT_ATTACHMENT_MIME_TYPES = new Set([
  'image/png',
  'image/jpg',
  'image/jpeg',
  'application/pdf',
]);

@Injectable()
export class TrustService {
  constructor(private readonly prisma: PrismaService) {}

  async createComplaint(authorId: string, dto: CreateComplaintDto) {
    if (dto.targetUserId) {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: dto.targetUserId },
        select: { id: true },
      });
      if (!targetUser) throw new NotFoundException('Target user not found');
    }

    if (dto.targetSessionId) {
      const targetSession = await this.prisma.session.findUnique({
        where: { id: dto.targetSessionId },
        select: { id: true },
      });
      if (!targetSession) throw new NotFoundException('Target session not found');
    }

    const occurredAt = this.parseRuDate(dto.occurredOn);
    const attachments = dto.attachments || [];

    for (const attachment of attachments) {
      this.validateAttachment(attachment.fileName, attachment.mimeType, attachment.size);
    }

    const complaint = await this.prisma.complaint.create({
      data: {
        authorId,
        targetUserId: dto.targetUserId,
        targetSessionId: dto.targetSessionId,
        category: dto.category,
        occurredAt,
        description: dto.description,
        attachments: {
          create: attachments.map((attachment) => ({
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.size,
          })),
        },
      },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
        targetUser: { select: { id: true, fullName: true, email: true } },
        attachments: true,
      },
    });
    return this.serializeComplaint(complaint);
  }

  async getMyComplaints(userId: string) {
    const complaints = await this.prisma.complaint.findMany({
      where: {
        OR: [{ authorId: userId }, { targetUserId: userId }, { assignedAdminId: userId }],
      },
      include: {
        author: { select: { id: true, fullName: true } },
        targetUser: { select: { id: true, fullName: true } },
        assignedAdmin: { select: { id: true, fullName: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return complaints.map((complaint) => this.serializeComplaint(complaint));
  }

  async getComplaintById(userId: string, complaintId: string, isAdmin: boolean) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
        targetUser: { select: { id: true, fullName: true, email: true } },
        assignedAdmin: { select: { id: true, fullName: true, email: true } },
        messages: {
          include: {
            sender: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: true,
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    if (
      !isAdmin &&
      complaint.authorId !== userId &&
      complaint.targetUserId !== userId &&
      complaint.assignedAdminId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return this.serializeComplaint(complaint);
  }

  async addComplaintMessage(userId: string, complaintId: string, dto: AddComplaintMessageDto, isAdmin: boolean) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      select: {
        id: true,
        authorId: true,
        targetUserId: true,
        assignedAdminId: true,
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    if (
      !isAdmin &&
      complaint.authorId !== userId &&
      complaint.targetUserId !== userId &&
      complaint.assignedAdminId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    const message = await this.prisma.complaintMessage.create({
      data: {
        complaintId,
        senderId: userId,
        body: dto.body,
      },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
    });

    if (isAdmin && !complaint.assignedAdminId) {
      await this.prisma.complaint.update({
        where: { id: complaintId },
        data: { assignedAdminId: userId, status: 'in_progress' },
      });
    }

    return message;
  }

  async adminListComplaints(status?: string) {
    const complaints = await this.prisma.complaint.findMany({
      where: status ? { status } : undefined,
      include: {
        author: { select: { id: true, fullName: true, email: true } },
        targetUser: { select: { id: true, fullName: true, email: true } },
        assignedAdmin: { select: { id: true, fullName: true, email: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return complaints.map((complaint) => this.serializeComplaint(complaint));
  }

  async adminUpdateComplaint(adminId: string, complaintId: string, dto: UpdateComplaintDto) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw new NotFoundException('Complaint not found');

    const data: any = {
      assignedAdminId: dto.assignedAdminId ?? complaint.assignedAdminId,
      status: dto.status ?? complaint.status,
      resolutionComment: dto.resolutionComment ?? complaint.resolutionComment,
    };

    if (dto.status === 'resolved' || dto.status === 'rejected') {
      data.closedAt = new Date();
      data.assignedAdminId = adminId;
    }

    if (dto.status === 'in_progress' && !data.assignedAdminId) {
      data.assignedAdminId = adminId;
    }

    const updated = await this.prisma.complaint.update({
      where: { id: complaintId },
      data,
    });

    await this.logAudit(adminId, 'complaint_update', 'complaint', complaintId, dto);
    return updated;
  }

  async uploadRegalia(mentorId: string, dto: UploadRegaliaDto) {
    this.validateRegaliaFile(dto.fileName, dto.mimeType, dto.size);

    const regalia = await this.prisma.mentorRegalia.create({
      data: {
        mentorId,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.size,
      },
    });

    await this.prisma.mentorProfile.updateMany({
      where: { userId: mentorId },
      data: { verificationStatus: 'pending' },
    });

    return this.serializeRegalia(regalia);
  }

  async getMyRegalia(mentorId: string) {
    const regalia = await this.prisma.mentorRegalia.findMany({
      where: { mentorId },
      orderBy: { createdAt: 'desc' },
    });
    return regalia.map((item) => this.serializeRegalia(item));
  }

  async adminListRegalia(status?: string) {
    const regalia = await this.prisma.mentorRegalia.findMany({
      where: status ? { status } : undefined,
      include: {
        mentor: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return regalia.map((item) => this.serializeRegalia(item));
  }

  async adminReviewRegalia(adminId: string, regaliaId: string, dto: ReviewRegaliaDto) {
    const regalia = await this.prisma.mentorRegalia.findUnique({ where: { id: regaliaId } });
    if (!regalia) throw new NotFoundException('Regalia not found');

    const updated = await this.prisma.mentorRegalia.update({
      where: { id: regaliaId },
      data: {
        status: dto.status,
        rejectionReason: dto.status === 'rejected' ? dto.rejectionReason : null,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    await this.prisma.mentorProfile.updateMany({
      where: { userId: regalia.mentorId },
      data: { verificationStatus: dto.status === 'approved' ? 'verified' : 'rejected' },
    });

    await this.logAudit(adminId, 'regalia_review', 'mentor_regalia', regaliaId, dto);
    return this.serializeRegalia(updated);
  }

  async blockUser(adminId: string, userId: string, dto: BlockUserDto) {
    if (adminId === userId) {
      throw new BadRequestException('Admin cannot block self');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          isBlocked: true,
          blockedAt: new Date(),
          blockedReason: dto.reason ?? 'Blocked by admin',
        },
      });

      await tx.userBlock.create({
        data: {
          userId,
          adminId,
          status: 'blocked',
          reason: dto.reason,
        },
      });

      return updatedUser;
    });

    await this.logAudit(adminId, 'user_block', 'user', userId, dto);
    return result;
  }

  async unblockUser(adminId: string, userId: string, dto: BlockUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          isBlocked: false,
          blockedAt: null,
          blockedReason: null,
        },
      });

      await tx.userBlock.create({
        data: {
          userId,
          adminId,
          status: 'unblocked',
          reason: dto.reason,
        },
      });

      return updatedUser;
    });

    await this.logAudit(adminId, 'user_unblock', 'user', userId, dto);
    return result;
  }

  async createModerationAction(adminId: string, dto: CreateModerationActionDto) {
    const action = await this.prisma.moderationAction.create({
      data: {
        adminId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        action: dto.action,
        reason: dto.reason,
      },
    });

    await this.logAudit(adminId, 'moderation_action', dto.targetType, dto.targetId, dto);
    return action;
  }

  async getAdminAuditLogs(limit = 50, offset = 0) {
    const [data, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        include: {
          admin: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.adminAuditLog.count(),
    ]);

    return {
      data,
      total,
      hasMore: offset + data.length < total,
    };
  }

  async getPlatformBalance() {
    const [fees, withdrawn] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: { in: ['succeeded', 'paid'] } },
        _sum: { platformFee: true },
      }),
      this.prisma.platformWithdrawal.aggregate({
        where: { status: { in: ['pending', 'completed'] } },
        _sum: { amount: true },
      }),
    ]);

    const totalFees = fees._sum.platformFee ?? 0;
    const totalWithdrawn = withdrawn._sum.amount ?? 0;

    return {
      totalFees,
      totalWithdrawn,
      available: Math.max(0, totalFees - totalWithdrawn),
      currency: 'USD',
    };
  }

  async createPlatformWithdrawal(adminId: string, dto: CreatePlatformWithdrawalDto) {
    const balance = await this.getPlatformBalance();
    if (dto.amount > balance.available) {
      throw new BadRequestException('Insufficient available platform balance');
    }

    const withdrawal = await this.prisma.platformWithdrawal.create({
      data: {
        adminId,
        amount: dto.amount,
        currency: dto.currency.toUpperCase(),
        provider: dto.provider,
        status: 'pending',
      },
    });

    await this.logAudit(adminId, 'platform_withdrawal_create', 'platform_withdrawal', withdrawal.id, dto);
    return withdrawal;
  }

  private async logAudit(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string | null,
    payload: unknown,
  ) {
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        targetType,
        targetId,
        payloadJson: payload as any,
      },
    });
  }

  private serializeComplaint<T extends { attachments?: Array<{ sizeBytes: bigint | number }> }>(complaint: T) {
    return {
      ...complaint,
      attachments: (complaint.attachments || []).map((attachment) => ({
        ...attachment,
        sizeBytes: Number(attachment.sizeBytes),
        size: Number(attachment.sizeBytes),
      })),
    };
  }

  private serializeRegalia<T extends { sizeBytes?: bigint | number | null }>(regalia: T) {
    return {
      ...regalia,
      sizeBytes: regalia.sizeBytes == null ? null : Number(regalia.sizeBytes),
      size: regalia.sizeBytes == null ? null : Number(regalia.sizeBytes),
    };
  }

  private parseRuDate(value: string) {
    const [day, month, year] = value.split('.').map((part) => Number(part));
    if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
      throw new BadRequestException('Invalid occurredOn format');
    }
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    if (
      Number.isNaN(date.getTime()) ||
      date.getUTCDate() !== day ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCFullYear() !== year
    ) {
      throw new BadRequestException('Invalid occurredOn date');
    }
    return date;
  }

  private validateAttachment(fileName: string, mimeType: string, size: number) {
    if (!Number.isInteger(size) || size < 1 || size > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException('Attachment size must be between 1 byte and 128MB');
    }

    const extension = this.getFileExtension(fileName);
    if (!ALLOWED_COMPLAINT_ATTACHMENT_EXTENSIONS.has(extension)) {
      throw new BadRequestException(`Unsupported complaint attachment format: ${fileName}`);
    }

    const mime = mimeType.toLowerCase();
    if (!ALLOWED_COMPLAINT_ATTACHMENT_MIME_TYPES.has(mime)) {
      throw new BadRequestException(`Unsupported complaint attachment mime type: ${mimeType}`);
    }
  }

  private validateRegaliaFile(fileName: string, mimeType: string, size: number) {
    if (!Number.isInteger(size) || size < 1 || size > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException('Regalia file size must be between 1 byte and 128MB');
    }
    if (this.getFileExtension(fileName) !== '.pdf') {
      throw new BadRequestException('Regalia file must be a .pdf document');
    }
    const mime = mimeType.toLowerCase();
    if (mime !== 'application/pdf') {
      throw new BadRequestException('Regalia mime type must be application/pdf');
    }
  }

  private getFileExtension(fileName: string) {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex < 0 ? '' : fileName.slice(dotIndex).toLowerCase();
  }
}
