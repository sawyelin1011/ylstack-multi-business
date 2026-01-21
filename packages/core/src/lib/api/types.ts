/**
 * API Type Definitions
 * Core types for the API layer including handlers, middleware, and utilities
 */

import type { Context, Next } from 'hono';
import type { AppContext } from './context';
import type { ApiResponse } from './responses';

// Handler type - function that processes HTTP requests
export type Handler<T = any> = (ctx: HonoContext) => Promise<Response | T>;

// Hono context type with our app context
export type HonoContext = Context<{ Bindings: AppContext }>;

// Middleware type - function that can modify requests/responses
export type HonoMiddleware = (ctx: HonoContext, next: Next) => Promise<void>;

// Re-export needed types for public API
export { Logger } from '../../logger';

// Route options interface
export interface RouteOptions {
  tags?: string[];
  description?: string;
  middleware?: HonoMiddleware[];
  auth?: 'required' | 'optional' | 'none';
  roles?: string[];
  permissions?: string[];
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  validate?: {
    body?: any; // Zod schema
    query?: any; // Zod schema
    params?: any; // Zod schema
    headers?: any; // Zod schema
  };
  response?: {
    statusCode?: number;
    contentType?: string;
  };
}

// Registered route information
export interface RegisteredRoute {
  method: string;
  path: string;
  handler: string; // Handler function name or reference
  tags?: string[];
  description?: string;
  auth?: RouteOptions['auth'];
  roles?: string[];
  permissions?: string[];
  middleware?: string[]; // Middleware names
}

// API route registration interface
export interface ApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
  path: string;
  handler: Handler;
  options: RouteOptions;
}

// HTTP method types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

// Middleware execution order
export type MiddlewareOrder = 
  | 'requestId'
  | 'logger'
  | 'timing'
  | 'security'
  | 'cors'
  | 'rateLimit'
  | 'validation'
  | 'auth'
  | 'handler'
  | 'errorHandler';

// Error response structure
export interface ErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    context?: Record<string, any>;
  };
  meta: {
    timestamp: string;
    requestId: string;
    duration?: number;
  };
}

// Success response structure
export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  meta: {
    timestamp: string;
    requestId: string;
    duration?: number;
  };
}

// Pagination response structure
export interface PaginatedResponse<T = any> {
  success: true;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  meta: {
    timestamp: string;
    requestId: string;
    duration?: number;
  };
}

// Validation error structure
export interface ValidationErrorResponse {
  success: false;
  data: null;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    context: {
      fields: Record<string, string[]>;
      details?: string;
    };
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

// API configuration interface
export interface ApiConfig {
  port: number;
  host: string;
  baseUrl: string;
  middleware: {
    requestId: boolean;
    logger: boolean;
    timing: boolean;
    security: boolean;
    cors: boolean;
    rateLimit: boolean;
    errorHandler: boolean;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  cors: {
    enabled: boolean;
    origin: string | boolean | string[];
    methods: string;
    headers: string;
    credentials: boolean;
  };
  security: {
    strictTransportSecurity: boolean;
    contentTypeOptions: boolean;
    frameOptions: 'DENY' | 'SAMEORIGIN';
    xssProtection: boolean;
    referrerPolicy: 'no-referrer' | 'strict-origin-when-cross-origin' | 'same-origin';
    contentSecurityPolicy?: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    includeHeaders: boolean;
    includeBody: boolean;
    redactSensitiveData: boolean;
  };
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
    config: {
      status: 'up' | 'down';
      error?: string;
    };
    memory: {
      status: 'up' | 'down';
      used: number;
      total: number;
      percentage: number;
    };
  };
}

// Readiness check response
export interface ReadinessCheckResponse {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: {
    database: {
      status: 'ready' | 'not_ready';
      error?: string;
    };
    dependencies: {
      status: 'ready' | 'not_ready';
      services: Record<string, 'ready' | 'not_ready'>;
    };
  };
}

// Version information
export interface VersionInfo {
  version: string;
  build: string;
  environment: string;
  node: string;
  runtime: string;
}

// Request logging data
export interface RequestLogData {
  requestId: string;
  method: string;
  path: string;
  query: Record<string, any>;
  headers: Record<string, string>;
  body?: any;
  userAgent?: string;
  ip: string;
  timestamp: string;
}

// Response logging data
export interface ResponseLogData {
  requestId: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: any;
  duration: number;
  timestamp: string;
}

// Error logging data
export interface ErrorLogData {
  requestId: string;
  error: {
    code: string;
    message: string;
    stack?: string;
    context?: Record<string, any>;
  };
  request: Partial<RequestLogData>;
  timestamp: string;
}

// Performance monitoring data
export interface PerformanceData {
  requestId: string;
  method: string;
  path: string;
  duration: number;
  memoryUsage?: NodeJS.MemoryUsage;
  timestamp: string;
}

// Rate limiting data
export interface RateLimitData {
  key: string;
  count: number;
  resetTime: number;
  remaining: number;
  limit: number;
  windowMs: number;
}

// Middleware execution context
export interface MiddlewareContext {
  requestId: string;
  method: string;
  path: string;
  user?: {
    id: string;
    roles: string[];
    permissions: string[];
  };
  validated: {
    body?: any;
    query?: any;
    params?: any;
    headers?: any;
  };
  metadata: Record<string, any>;
}

// API route group configuration
export interface RouteGroup {
  name: string;
  prefix: string;
  middleware?: HonoMiddleware[];
  routes: ApiRoute[];
}

// Server startup configuration
export interface ServerConfig {
  port: number;
  host: string;
  env: string;
  logger: Logger;
  database: Database;
  config: Config;
}

// Utility type for API responses
export type ApiResponseType<T> = ApiResponse<T> | SuccessResponse<T> | ErrorResponse | PaginatedResponse<T>;

// Handler result type
export type HandlerResult = Response | ApiResponseType<any> | any;

// Middleware result type
export type MiddlewareResult = void | Response;

// Route registration result
export interface RouteRegistration {
  method: HttpMethod;
  path: string;
  handler: Handler;
  options: RouteOptions;
}

// API documentation data
export interface ApiDocumentation {
  title: string;
  version: string;
  description: string;
  servers: Array<{
    url: string;
    description: string;
  }>;
  tags: Array<{
    name: string;
    description: string;
  }>;
  routes: RegisteredRoute[];
}

// Schema validation options
export interface ValidationOptions {
  strict?: boolean;
  coerce?: boolean;
  abortEarly?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
}

// Request parsing options
export interface RequestParsingOptions {
  json?: boolean;
  form?: boolean;
  text?: boolean;
  urlencoded?: boolean;
  raw?: boolean;
  limit?: number;
}

// Response serialization options
export interface ResponseSerializationOptions {
  exclude?: string[];
  include?: string[];
  transform?: Record<string, (value: any) => any>;
  dateFormat?: 'iso' | 'unix' | 'locale';
  indent?: number | string;
}

// Middleware composition options
export interface MiddlewareCompositionOptions {
  parallel?: boolean;
  ordered?: boolean;
  catchErrors?: boolean;
  timeout?: number;
}

// API event types
export type ApiEventType = 
  | 'request.started'
  | 'request.completed'
  | 'request.failed'
  | 'response.sent'
  | 'error.occurred'
  | 'middleware.executed'
  | 'route.registered'
  | 'server.started'
  | 'server.stopped';

// API event data
export interface ApiEventData {
  type: ApiEventType;
  timestamp: string;
  requestId?: string;
  data?: Record<string, any>;
}

// Event handler type
export type EventHandler<T = any> = (data: T) => void | Promise<void>;

// API event emitter interface
export interface ApiEventEmitter {
  on<T>(event: ApiEventType, handler: EventHandler<T>): void;
  off(event: ApiEventType, handler: EventHandler): void;
  emit<T>(event: ApiEventType, data: T): void;
  emitSync<T>(event: ApiEventType, data: T): void;
}

// Re-export commonly used types from other modules
export { 
  type AppContext,
  type UserPayload,
  type Database,
  type Logger,
  type Config
} from './context';

export { 
  type ApiResponse,
  type SuccessResponse,
  type ErrorResponse,
  type PaginatedResponse
} from './responses';

export { 
  type HonoMiddleware 
} from './validation';

// Export all types as a namespace
export * as ApiTypes from './types';