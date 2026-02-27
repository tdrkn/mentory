import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      const nodeEnv = this.config.get<string>('NODE_ENV') || 'development';
      const email =
        this.config.get<string>('ADMIN_EMAIL') ||
        (nodeEnv !== 'production' ? 'admin@mentory.local' : undefined);
      const password =
        this.config.get<string>('ADMIN_PASSWORD') ||
        (nodeEnv !== 'production' ? 'change-me-admin' : undefined);

      if (!email || !password) {
        this.logger.warn('ADMIN_EMAIL or ADMIN_PASSWORD not set; admin user will not be created.');
        return;
      }

      const existing = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true },
      });

      if (existing) {
        if (existing.role !== 'admin') {
          await this.prisma.user.update({
            where: { id: existing.id },
            data: { role: 'admin' },
          });
          this.logger.log(`User ${email} promoted to admin.`);
        }
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await this.prisma.user.create({
        data: {
          email,
          username: 'admin',
          passwordHash,
          fullName: 'Admin',
          role: 'admin',
          timezone: 'UTC',
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
        select: { id: true },
      });

      this.logger.log(`Admin user created: ${email}`);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
        this.logger.error(
          `Admin bootstrap skipped due to schema drift (${error.message}). ` +
            'Apply Prisma schema changes to the database and restart.',
        );
        return;
      }
      throw error;
    }
  }
}
