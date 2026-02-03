import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { StructuredLogger } from './common/logger';
import * as prismaModule from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const logger = new StructuredLogger();
  logger.setContext('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: process.env.ENABLE_STRUCTURED_LOGS === 'true' ? logger : undefined,
  });

  app.enableCors({
    origin:
      process.env.CORS_ORIGIN ||
      process.env.PUBLIC_APP_URL ||
      'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api', {
    exclude: ['admin', 'admin/(.*)'],
  });

  await setupAdmin(app);

  const port = process.env.API_PORT || 4000;
  await app.listen(port);
  
  logger.log(`🚀 API running on http://localhost:${port}`);
  logger.log(`📊 Health check: http://localhost:${port}/api/health/ready`);
}

bootstrap();

async function setupAdmin(app: any) {
  try {
    const loadEsm = (specifier: string) =>
      new Function('s', 'return import(s)')(specifier) as Promise<any>;

    const { default: AdminJS } = await loadEsm('adminjs');
    const { Database, Resource } = await loadEsm('@adminjs/prisma');
    const { buildAuthenticatedRouter } = await loadEsm('@adminjs/express');

    AdminJS.registerAdapter({ Database, Resource });

    const prisma = new prismaModule.PrismaClient();
    await prisma.$connect();
    const cookieSecret = process.env.ADMIN_COOKIE_SECRET || 'dev-admin-cookie-secret-change-me';

    const admin = new AdminJS({
      rootPath: '/admin',
      databases: [{ client: prisma }],
      branding: {
        companyName: 'Mentory Admin',
      },
    });

    const router = buildAuthenticatedRouter(
      admin,
      {
        authenticate: async (email, password) => {
          if (!email || !password) return null;
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || user.role !== 'admin') return null;
          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) return null;
          return { id: user.id, email: user.email, role: user.role };
        },
        cookieName: 'mentory-admin',
        cookiePassword: cookieSecret,
      },
      null,
      {
        resave: false,
        saveUninitialized: false,
        secret: cookieSecret,
      },
    );

    app.use(admin.options.rootPath, router);
  } catch (error) {
    // AdminJS should not block API startup in dev
    console.warn('AdminJS failed to initialize:', error);
  }
}
