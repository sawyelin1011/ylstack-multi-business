/**
 * Middleware Exports
 * Exports all middleware for easy importing
 */

// Request ID middleware
export { requestIdMiddleware, getRequestId, generateChildRequestId, createRequestContext } from './request-id';

// Logger middleware
export { loggerMiddleware, logWithContext, createChildLogger } from './logger';

// Timing middleware
export { 
  timingMiddleware, 
  getRequestDuration, 
  getRequestStartTime, 
  calculateRequestDuration,
  PerformanceMonitor,
  SlowQueryDetector,
  timingStats
} from './timing';

// Security headers middleware
export { 
  securityMiddleware,
  createContentSecurityPolicyMiddleware,
  createStrictTransportSecurityMiddleware,
  createCustomSecurityHeadersMiddleware
} from './security';

// CORS middleware
export { 
  corsMiddleware,
  createCorsMiddleware,
  CorsUtils
} from './cors';

// Rate limiting middleware
export { 
  rateLimitMiddleware,
  createRateLimitMiddleware,
  RateLimitUtils
} from './rate-limit';

// Error handler middleware
export { 
  errorHandlerMiddleware,
  createErrorHandlerMiddleware,
  asyncHandler,
  syncHandler,
  ErrorHandler
} from './error-handler';

/**
 * Complete middleware pipeline for production API
 * This is the recommended middleware stack in the correct order
 */
export const apiMiddleware = [
  'requestId',
  'logger', 
  'timing',
  'security',
  'cors',
  'rateLimit',
  'errorHandler',
] as const;

/**
 * Get middleware by name
 */
export function getMiddlewareByName(name: string): any {
  const middlewareMap: Record<string, any> = {
    requestId: requestIdMiddleware,
    logger: loggerMiddleware,
    timing: timingMiddleware,
    security: securityMiddleware,
    cors: corsMiddleware,
    rateLimit: rateLimitMiddleware,
    errorHandler: errorHandlerMiddleware,
  };
  
  return middlewareMap[name];
}

/**
 * Create middleware pipeline
 */
export function createMiddlewarePipeline(middlewareNames: string[]): any[] {
  return middlewareNames.map(name => getMiddlewareByName(name)).filter(Boolean);
}

/**
 * Default production middleware pipeline
 */
export const defaultMiddlewarePipeline = createMiddlewarePipeline(apiMiddleware);