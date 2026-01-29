import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

interface HealthCheck {
  status: 'ok' | 'error';
  message?: string;
  latencyMs?: number;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
  };
}

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();
  private redis: Redis | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    // Initialize Redis client for health checks
    const redisHost = this.config.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.config.get<number>('REDIS_PORT', 6379);
    try {
      this.redis = new Redis({ host: redisHost, port: redisPort, lazyConnect: true });
    } catch {
      // Redis might not be available
    }
  }

  /**
   * GET /api/health
   * Quick health check for load balancers
   */
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'mentory-api',
    };
  }

  /**
   * GET /api/health/ready
   * Readiness probe - checks all dependencies
   */
  @Get('ready')
  async readiness(): Promise<HealthResponse> {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };

    const allOk = Object.values(checks).every(c => c.status === 'ok');
    const allFailed = Object.values(checks).every(c => c.status === 'error');

    const status = allOk ? 'healthy' : allFailed ? 'unhealthy' : 'degraded';

    const response: HealthResponse = {
      status,
      timestamp: new Date().toISOString(),
      service: 'mentory-api',
      version: process.env.npm_package_version || '0.1.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks,
    };

    if (status === 'unhealthy') {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }

  /**
   * GET /api/health/live
   * Liveness probe - is the process alive
   */
  @Get('live')
  liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Database connection failed',
        latencyMs: Date.now() - start,
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    if (!this.redis) {
      return { status: 'error', message: 'Redis client not initialized' };
    }

    const start = Date.now();
    try {
      await this.redis.ping();
      return {
        status: 'ok',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Redis connection failed',
        latencyMs: Date.now() - start,
      };
    }
  }
}
