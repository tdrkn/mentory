import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { createLogger } from './logger';

const logger = createLogger('HTTP');

/**
 * Request logging middleware
 * - Adds request ID to all requests
 * - Logs request/response with timing
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id'] as string || randomUUID();
    const startTime = Date.now();

    // Attach request ID to request object
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);

    // Log incoming request
    logger.log(`→ ${req.method} ${req.originalUrl}`, {
      requestId,
      method: req.method,
      path: req.originalUrl,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';

      const message = `← ${req.method} ${req.originalUrl} ${statusCode} ${duration}ms`;
      
      if (logLevel === 'error') {
        logger.error(message, undefined, { requestId, method: req.method, path: req.originalUrl, statusCode, duration });
      } else if (logLevel === 'warn') {
        logger.warn(message, { requestId, method: req.method, path: req.originalUrl, statusCode, duration });
      } else {
        logger.log(message, { requestId, method: req.method, path: req.originalUrl, statusCode, duration });
      }
    });

    next();
  }
}
