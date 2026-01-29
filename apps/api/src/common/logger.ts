import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface LogContext {
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Structured Logger for production-ready logging
 * 
 * Features:
 * - JSON output in production, pretty print in development
 * - Request ID tracking
 * - Configurable log levels via LOG_LEVEL env
 * - Sentry integration ready
 */
@Injectable()
export class StructuredLogger implements LoggerService {
  private context: string = 'App';
  private readonly logLevel: LogLevel;
  private readonly isProduction: boolean;
  private readonly enableSentry: boolean;

  private readonly levels: Record<LogLevel, number> = {
    verbose: 0,
    debug: 1,
    log: 2,
    warn: 3,
    error: 4,
    fatal: 5,
  };

  constructor(private readonly config?: ConfigService) {
    const envLevel = this.config?.get<string>('LOG_LEVEL', 'log') || process.env.LOG_LEVEL || 'log';
    this.logLevel = envLevel as LogLevel;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.enableSentry = process.env.ENABLE_SENTRY === 'true';
  }

  setContext(context: string) {
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  private formatMessage(level: string, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logContext = context || {};

    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      context: this.context,
      message,
      ...logContext,
    };

    if (this.isProduction) {
      // JSON for production (ELK, CloudWatch, etc.)
      return JSON.stringify(logEntry);
    }

    // Pretty print for development
    const contextStr = logContext.requestId ? ` [${logContext.requestId}]` : '';
    const levelColor = {
      VERBOSE: '\x1b[37m', // white
      DEBUG: '\x1b[36m',   // cyan
      LOG: '\x1b[32m',     // green
      WARN: '\x1b[33m',    // yellow
      ERROR: '\x1b[31m',   // red
      FATAL: '\x1b[35m',   // magenta
    }[level.toUpperCase()] || '\x1b[0m';

    const reset = '\x1b[0m';
    return `${timestamp} ${levelColor}[${level.toUpperCase()}]${reset} [${this.context}]${contextStr} ${message}`;
  }

  log(message: string, context?: LogContext | string) {
    if (!this.shouldLog('log')) return;
    const ctx = typeof context === 'string' ? { context } : context;
    console.log(this.formatMessage('log', message, ctx));
  }

  error(message: string, trace?: string, context?: LogContext | string) {
    if (!this.shouldLog('error')) return;
    const ctx = typeof context === 'string' ? { context } : context;
    const logMessage = this.formatMessage('error', message, { ...ctx, trace });
    console.error(logMessage);

    // Sentry integration
    if (this.enableSentry) {
      this.captureToSentry(message, trace, ctx);
    }
  }

  warn(message: string, context?: LogContext | string) {
    if (!this.shouldLog('warn')) return;
    const ctx = typeof context === 'string' ? { context } : context;
    console.warn(this.formatMessage('warn', message, ctx));
  }

  debug(message: string, context?: LogContext | string) {
    if (!this.shouldLog('debug')) return;
    const ctx = typeof context === 'string' ? { context } : context;
    console.debug(this.formatMessage('debug', message, ctx));
  }

  verbose(message: string, context?: LogContext | string) {
    if (!this.shouldLog('verbose')) return;
    const ctx = typeof context === 'string' ? { context } : context;
    console.log(this.formatMessage('verbose', message, ctx));
  }

  fatal(message: string, context?: LogContext | string) {
    if (!this.shouldLog('fatal')) return;
    const ctx = typeof context === 'string' ? { context } : context;
    console.error(this.formatMessage('fatal', message, ctx));
  }

  private captureToSentry(message: string, trace?: string, context?: LogContext) {
    // TODO: Integrate with @sentry/node when ENABLE_SENTRY=true
    // import * as Sentry from '@sentry/node';
    // Sentry.captureException(new Error(message), { extra: { trace, ...context } });
  }
}

// Factory for creating loggers with context
export function createLogger(context: string): StructuredLogger {
  const logger = new StructuredLogger();
  logger.setContext(context);
  return logger;
}
