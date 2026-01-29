import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { StructuredLogger } from './common/logger';

async function bootstrap() {
  const logger = new StructuredLogger();
  logger.setContext('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: process.env.ENABLE_STRUCTURED_LOGS === 'true' ? logger : undefined,
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.API_PORT || 4000;
  await app.listen(port);
  
  logger.log(`🚀 API running on http://localhost:${port}`);
  logger.log(`📊 Health check: http://localhost:${port}/api/health/ready`);
}

bootstrap();
