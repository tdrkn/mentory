import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { User, UserRole } from '@prisma/client';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user with profile
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        timezone: dto.timezone || 'UTC',
        role: dto.role as UserRole,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        ...(dto.role === 'mentor' && {
          mentorProfile: { create: {} },
        }),
        ...(dto.role === 'mentee' && {
          menteeProfile: { create: {} },
        }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return user;
  }

  async login(user: User) {
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshToken(user: User) {
    return this.generateTokens(user);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        timezone: true,
        role: true,
        isEmailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        mentorProfile: true,
        menteeProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async logout(userId: string) {
    // In a real app, you might want to:
    // - Add token to blacklist (Redis)
    // - Remove refresh token from DB
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    // Prevent email enumeration
    if (!user) {
      return { success: true };
    }

    const resetToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        purpose: 'password_reset',
      },
      {
        expiresIn: this.config.get<string>('PASSWORD_RESET_EXPIRES_IN', '30m'),
      },
    );

    const resetUrl = `${this.getWebAppUrl()}/reset-password?token=${encodeURIComponent(resetToken)}`;

    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Восстановление пароля Mentory',
        text: [
          `Здравствуйте, ${user.fullName || 'пользователь'}!`,
          '',
          'Вы запросили восстановление пароля в Mentory.',
          `Перейдите по ссылке, чтобы задать новый пароль: ${resetUrl}`,
          '',
          'Ссылка действительна 30 минут.',
          'Если вы не запрашивали восстановление, просто проигнорируйте это письмо.',
        ].join('\n'),
        html: `
          <p>Здравствуйте, <strong>${user.fullName || 'пользователь'}</strong>!</p>
          <p>Вы запросили восстановление пароля в Mentory.</p>
          <p>
            <a href="${resetUrl}" target="_blank" rel="noopener noreferrer">
              Перейти к восстановлению пароля
            </a>
          </p>
          <p>Ссылка действительна 30 минут.</p>
          <p>Если вы не запрашивали восстановление, просто проигнорируйте это письмо.</p>
        `,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Failed to send password reset email to ${user.email}: ${message}`);
      throw new BadRequestException('Could not send reset email. Please try again later.');
    }

    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: any;

    try {
      payload = this.jwtService.verify(dto.token);
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (!payload?.sub || payload?.purpose !== 'password_reset') {
      throw new BadRequestException('Invalid reset token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('Invalid reset token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return { success: true };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    let payload: any;

    try {
      payload = this.jwtService.verify(dto.token);
    } catch {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (!payload?.sub || payload?.purpose !== 'email_verification' || !payload?.email) {
      throw new BadRequestException('Invalid verification token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, isEmailVerified: true },
    });

    if (!user || user.email !== payload.email) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.isEmailVerified) {
      return { success: true, alreadyVerified: true };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    return { success: true };
  }

  async resendVerificationEmail(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        fullName: true,
        isEmailVerified: true,
      },
    });

    // Prevent email enumeration
    if (!user || user.isEmailVerified) {
      return { success: true };
    }

    await this.sendEmailVerification(user);
    return { success: true };
  }

  private async generateTokens(user: Pick<User, 'id' | 'email' | 'role'>) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
    };
  }

  private getWebAppUrl() {
    return (
      this.config.get<string>('PUBLIC_APP_URL') ||
      this.config.get<string>('WEB_URL') ||
      'http://localhost:3000'
    );
  }

  private async sendEmailVerification(user: { id: string; email: string; fullName: string | null }) {
    const verifyToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        purpose: 'email_verification',
      },
      {
        expiresIn: this.config.get<string>('EMAIL_VERIFICATION_EXPIRES_IN', '24h'),
      },
    );

    const verifyUrl = `${this.getWebAppUrl()}/verify-email?token=${encodeURIComponent(verifyToken)}`;

    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Подтверждение email в Mentory',
        text: [
          `Здравствуйте, ${user.fullName || 'пользователь'}!`,
          '',
          'Подтвердите ваш email, чтобы завершить регистрацию в Mentory.',
          `Ссылка для подтверждения: ${verifyUrl}`,
          '',
          'Если вы не регистрировались, проигнорируйте это письмо.',
        ].join('\n'),
        html: `
          <p>Здравствуйте, <strong>${user.fullName || 'пользователь'}</strong>!</p>
          <p>Подтвердите ваш email, чтобы завершить регистрацию в Mentory.</p>
          <p>
            <a href="${verifyUrl}" target="_blank" rel="noopener noreferrer">
              Подтвердить email
            </a>
          </p>
          <p>Если вы не регистрировались, проигнорируйте это письмо.</p>
        `,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Failed to send verification email to ${user.email}: ${message}`);
      throw new BadRequestException('Could not send verification email. Please try again later.');
    }
  }
}
