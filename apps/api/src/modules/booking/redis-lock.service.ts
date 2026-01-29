import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Distributed Lock Service
 * 
 * Implements Redlock-like pattern for distributed locking.
 * Prevents race conditions in slot booking.
 * 
 * Lock pattern:
 * - Key: lock:slot:{slotId}
 * - Value: unique lock token
 * - TTL: 10 seconds (auto-release safety)
 */
@Injectable()
export class RedisLockService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  private readonly lockTTL = 10; // seconds

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  async onModuleDestroy() {
    await this.redis?.quit();
  }

  /**
   * Acquire a lock for a resource
   * @param resourceId - The ID of the resource to lock (e.g., slotId)
   * @param prefix - Lock key prefix (default: 'slot')
   * @returns Lock token if acquired, null if failed
   */
  async acquireLock(resourceId: string, prefix = 'slot'): Promise<string | null> {
    const lockKey = `lock:${prefix}:${resourceId}`;
    const lockToken = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // SET NX EX - Set if not exists with expiry
    const result = await this.redis.set(lockKey, lockToken, 'EX', this.lockTTL, 'NX');

    if (result === 'OK') {
      return lockToken;
    }

    return null;
  }

  /**
   * Release a lock
   * Only releases if the token matches (prevents releasing others' locks)
   */
  async releaseLock(resourceId: string, lockToken: string, prefix = 'slot'): Promise<boolean> {
    const lockKey = `lock:${prefix}:${resourceId}`;

    // Lua script for atomic check-and-delete
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(script, 1, lockKey, lockToken);
    return result === 1;
  }

  /**
   * Execute a function with a lock
   * Automatically acquires and releases lock
   */
  async withLock<T>(
    resourceId: string,
    fn: () => Promise<T>,
    prefix = 'slot',
  ): Promise<{ success: boolean; result?: T; error?: string }> {
    const lockToken = await this.acquireLock(resourceId, prefix);

    if (!lockToken) {
      return {
        success: false,
        error: 'Resource is currently locked. Please try again.',
      };
    }

    try {
      const result = await fn();
      return { success: true, result };
    } finally {
      await this.releaseLock(resourceId, lockToken, prefix);
    }
  }
}
