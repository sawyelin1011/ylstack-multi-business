/**
 * API Layer Public API
 * Simplified exports for core functionality
 */

// Core server and router
export { createApiServer, startServer, stopServer } from './server';
export { ApiRouter } from './router';

// Error handling
export { 
  AppError, 
  ValidationError, 
  UnauthorizedError, 
  ForbiddenError, 
  NotFoundError, 
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  InternalError,
  BadGatewayError,
  ServiceUnavailableError,
  ErrorUtils,
  ERROR_CODES,
  HTTP_STATUS
} from './errors';

// Response utilities
export { 
  successResponse, 
  createdResponse, 
  errorResponse, 
  noContentResponse, 
  redirectResponse, 
  paginatedResponse,
  ResponseBuilder,
  ResponseUtils
} from './responses';

// Request validation
export { 
  validateBody, 
  validateQuery, 
  validateParams, 
  validateHeaders,
  validate,
  getValidatedBody,
  getValidatedQuery,
  getValidatedParams,
  getValidatedHeaders,
  getRawBody,
  getRawQuery,
  getRawParams,
  CommonSchemas,
  createValidationMiddleware
} from './validation';

// Application context (simplified)
export { 
  AppContext, 
  UserPayload,
  ContextUtils
} from './context';

// Middleware exports
export { 
  requestIdMiddleware, 
  getRequestId, 
  generateChildRequestId, 
  createRequestContext,
  loggerMiddleware, 
  logWithContext, 
  createChildLogger,
  timingMiddleware, 
  getRequestDuration, 
  getRequestStartTime, 
  calculateRequestDuration,
  PerformanceMonitor,
  SlowQueryDetector,
  timingStats,
  securityMiddleware,
  createContentSecurityPolicyMiddleware,
  createStrictTransportSecurityMiddleware,
  createCustomSecurityHeadersMiddleware,
  corsMiddleware,
  createCorsMiddleware,
  CorsUtils,
  rateLimitMiddleware,
  createRateLimitMiddleware,
  RateLimitUtils,
  errorHandlerMiddleware,
  createErrorHandlerMiddleware,
  asyncHandler,
  syncHandler,
  ErrorHandler
} from './middleware';

// Logger system
export { createLogger, createRequestLogger, createChildLogger } from '../logger';

// Route decorators and utilities
export { 
  route, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Patch, 
  Options, 
  Head,
  middleware,
  createRouteGroup,
  createRouter,
  createHealthRouter,
  mergeRouters
} from './router';

// Default API configuration
export const defaultApiConfig = {
  middleware: ['requestId', 'logger', 'timing', 'security', 'cors', 'rateLimit', 'errorHandler'],
  port: 3000,
  host: '0.0.0.0',
  cors: {
    enabled: true,
    origin: '*',
    methods: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    headers: 'Content-Type, Authorization, X-Request-ID',
    credentials: false,
  },
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
  security: {
    strictTransportSecurity: true,
    contentTypeOptions: true,
    frameOptions: 'DENY',
    xssProtection: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
  },
};