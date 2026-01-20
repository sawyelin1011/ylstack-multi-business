/**
 * Request ID Middleware
 * Generates and manages unique request IDs for distributed tracing
 */

import { v4 as uuidv4 } from 'uuid';
import type { Context } from 'hono';
import type { LogContext } from '../../logger';

/**
 * Generate a new UUID v4 request ID
 */
function generateRequestId(): string {
  return uuidv4();
}

/**
 * Extract request ID from incoming request headers
 */
function extractRequestId(headers: Headers): string | null {
  const requestId = headers.get('X-Request-ID') || 
                   headers.get('x-request-id') ||
                   headers.get('Request-ID') ||
                   headers.get('X-Correlation-ID') ||
                   headers.get('x-correlation-id');
  
  return requestId;
}

/**
 * Request ID middleware
 * - Generates a new request ID if not present in headers
 * - Adds request ID to response headers
 * - Makes request ID available in context and logger
 */
export async function requestIdMiddleware(ctx: Context, next: () => Promise<void>): Promise<void> {
  // Extract existing request ID or generate new one
  const requestId = extractRequestId(ctx.req.headers) || generateRequestId();
  
  // Set request ID in context for use by handlers
  ctx.set('requestId', requestId);
  
  // Add request ID to response headers
  ctx.header('X-Request-ID', requestId);
  
  // Add correlation ID for distributed tracing (alias for request ID)
  ctx.header('X-Correlation-ID', requestId);
  
  await next();
}

/**
 * Get request ID from context
 */
export function getRequestId(ctx: Context): string {
  return ctx.get('requestId');
}

/**
 * Generate a child request ID for sub-operations
 * Uses the parent request ID as prefix
 */
export function generateChildRequestId(parentRequestId: string): string {
  return `${parentRequestId}-child-${Math.random().toString(36).substr(2, 8)}`;
}

/**
 * Create context with request ID for logging
 */
export function createRequestContext(requestId: string, additionalContext: LogContext = {}): LogContext {
  return {
    requestId,
    ...additionalContext,
  };
}