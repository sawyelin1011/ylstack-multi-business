/**
 * Request/Response Logger Middleware
 * Logs all incoming requests and outgoing responses with detailed context
 */

import type { Context } from 'hono';
import { createRequestLogger } from '../../logger';
import { getRequestId } from './request-id';

/**
 * Logger middleware for HTTP requests and responses
 * - Logs incoming request details
 * - Logs response status and duration
 * - Includes request ID for tracing
 * - Logs user context if authenticated
 */
export async function loggerMiddleware(ctx: Context, next: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  const requestId = getRequestId(ctx);
  
  // Create logger with request context
  const logger = createRequestLogger(requestId, {
    method: ctx.req.method,
    path: ctx.req.path,
    ip: getClientIP(ctx),
    userAgent: ctx.req.header('user-agent'),
  });

  // Log incoming request
  logger.info('Incoming request', {
    method: ctx.req.method,
    path: ctx.req.path,
    query: ctx.req.query(),
    headers: sanitizeHeaders(ctx.req.headers),
    contentType: ctx.req.header('content-type'),
    contentLength: ctx.req.header('content-length'),
  });

  try {
    // Continue to next middleware/handler
    await next();
    
    // Get response details
    const duration = Date.now() - startTime;
    const response = ctx.res;
    
    // Log response
    logger.info('Request completed', {
      status: response.status,
      statusText: response.statusText,
      duration,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
    });
    
    // Add response timing header if not already present
    if (!response.headers.has('X-Response-Time')) {
      response.headers.set('X-Response-Time', `${duration}ms`);
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log error
    logger.error('Request failed', error, {
      status: 500,
      duration,
      errorType: error?.constructor?.name,
    });
    
    // Re-throw the error to be handled by error handler
    throw error;
  }
}

/**
 * Get client IP address from request
 */
function getClientIP(ctx: Context): string {
  // Try various headers that might contain the real IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];
  
  for (const header of headers) {
    const ip = ctx.req.header(header);
    if (ip) {
      // Handle comma-separated IPs (take the first one)
      const ips = ip.split(',').map(ip => ip.trim());
      return ips[0];
    }
  }
  
  // Fallback to connection info if available
  const conn = ctx.req as any;
  if (conn?.ip) {
    return conn.ip;
  }
  
  return 'unknown';
}

/**
 * Sanitize headers for logging (remove sensitive information)
 */
function sanitizeHeaders(headers: Headers): Record<string, string> {
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'proxy-authorization',
  ];
  
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of headers.entries()) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveHeaders.includes(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (lowerKey.includes('authorization') || lowerKey.includes('token')) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Log structured data with request context
 */
export function logWithContext(
  ctx: Context,
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  data?: any
): void {
  const logger = createRequestLogger(getRequestId(ctx), {
    method: ctx.req.method,
    path: ctx.req.path,
    ip: getClientIP(ctx),
  });
  
  switch (level) {
    case 'debug':
      logger.debug(message, data);
      break;
    case 'info':
      logger.info(message, data);
      break;
    case 'warn':
      logger.warn(message, data);
      break;
    case 'error':
      logger.error(message, data);
      break;
  }
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(
  ctx: Context,
  additionalContext: Record<string, any>
) {
  const requestId = getRequestId(ctx);
  return createRequestLogger(requestId, {
    ...additionalContext,
    method: ctx.req.method,
    path: ctx.req.path,
  });
}