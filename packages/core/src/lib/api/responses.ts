/**
 * Standardized API Response Utilities
 * Consistent response format across all API endpoints
 */

import { AppError } from './errors';
import type { LogContext } from '../logger';

// Response type definitions
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    context?: Record<string, any>;
  };
  meta: {
    timestamp: string;
    requestId: string;
    duration?: number;
    [key: string]: any;
  };
}

export interface CreatedResponse<T = any> extends ApiResponse<T> {
  data: T;
}

export interface ErrorResponse extends ApiResponse<null> {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    context?: Record<string, any>;
  };
}

export interface SuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data?: T;
}

interface MetaOptions {
  requestId: string;
  duration?: number;
  [key: string]: any;
}

/**
 * Generate a standardized meta object for responses
 */
function createMeta(options: MetaOptions): ApiResponse['meta'] {
  const { requestId, duration, ...additionalMeta } = options;
  
  return {
    timestamp: new Date().toISOString(),
    requestId,
    ...(duration !== undefined && { duration }),
    ...additionalMeta,
  };
}

/**
 * Create a successful response
 */
export function successResponse<T>(
  data?: T,
  meta?: MetaOptions & { requestId?: string }
): SuccessResponse<T> {
  const requestId = meta?.requestId || generateRequestId();
  
  return {
    success: true,
    ...(data !== undefined && { data }),
    meta: createMeta({
      requestId,
      duration: meta?.duration,
      ...(meta && Object.keys(meta).length > 0 && { ...meta })
    }),
  };
}

/**
 * Create a created (201) response
 */
export function createdResponse<T>(
  data: T,
  meta?: MetaOptions & { requestId?: string }
): CreatedResponse<T> {
  const requestId = meta?.requestId || generateRequestId();
  
  return {
    success: true,
    data,
    meta: createMeta({
      requestId,
      duration: meta?.duration,
      ...(meta && Object.keys(meta).length > 0 && { ...meta })
    }),
  };
}

/**
 * Create an error response
 */
export function errorResponse(
  error: AppError | Error,
  meta?: MetaOptions & { requestId?: string }
): ErrorResponse {
  const requestId = meta?.requestId || generateRequestId();
  
  // Convert to AppError if needed
  const appError = error instanceof AppError ? error : new AppError(
    error.message || 'Unknown error',
    500,
    'INTERNAL_ERROR'
  );
  
  return {
    success: false,
    data: null,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.context && { context: appError.context }),
    },
    meta: createMeta({
      requestId,
      duration: meta?.duration,
      statusCode: appError.statusCode,
    }),
  };
}

/**
 * Create a no content (204) response
 */
export function noContentResponse(
  meta?: MetaOptions & { requestId?: string }
): Response {
  const requestId = meta?.requestId || generateRequestId();
  const response = new Response(null, {
    status: 204,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...(meta?.duration && { 'X-Response-Time': `${meta.duration}ms` }),
    },
  });
  
  return response;
}

/**
 * Create a redirect response
 */
export function redirectResponse(
  location: string,
  status: 301 | 302 | 303 | 307 | 308 = 302,
  meta?: MetaOptions & { requestId?: string }
): Response {
  const requestId = meta?.requestId || generateRequestId();
  
  return new Response(null, {
    status,
    headers: {
      'Location': location,
      'X-Request-ID': requestId,
      ...(meta?.duration && { 'X-Response-Time': `${meta.duration}ms` }),
    },
  });
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  },
  meta?: MetaOptions & { requestId?: string }
): SuccessResponse<{
  items: T[];
  pagination: typeof pagination;
}> {
  const requestId = meta?.requestId || generateRequestId();
  
  return {
    success: true,
    data: {
      items: data,
      pagination: {
        ...pagination,
        hasNext: pagination.page < pagination.totalPages,
        hasPrev: pagination.page > 1,
      },
    },
    meta: createMeta({
      requestId,
      duration: meta?.duration,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    }),
  };
}

/**
 * Utility functions for response handling
 */
export const ResponseUtils = {
  /**
   * Set common response headers
   */
  setHeaders(response: Response, headers: Record<string, string>): Response {
    const newHeaders = new Headers(response.headers);
    Object.entries(headers).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },

  /**
   * Add CORS headers to response
   */
  addCorsHeaders(
    response: Response,
    origin: string,
    methods: string = 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    headers: string = 'Content-Type, Authorization, X-Request-ID'
  ): Response {
    return ResponseUtils.setHeaders(response, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': headers,
      'Access-Control-Max-Age': '86400',
    });
  },

  /**
   * Add security headers to response
   */
  addSecurityHeaders(response: Response): Response {
    return ResponseUtils.setHeaders(response, {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    });
  },

  /**
   * Check if response is successful
   */
  isSuccessful(response: Response): boolean {
    return response.status >= 200 && response.status < 300;
  },

  /**
   * Check if response is client error
   */
  isClientError(response: Response): boolean {
    return response.status >= 400 && response.status < 500;
  },

  /**
   * Check if response is server error
   */
  isServerError(response: Response): boolean {
    return response.status >= 500;
  },
};

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  // Simple UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Response builder class for complex responses
 */
export class ResponseBuilder {
  private response: Partial<ApiResponse> = {
    success: true,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
    },
  };

  private data: any = undefined;
  private error: any = undefined;
  private statusCode: number = 200;

  constructor(requestId?: string) {
    if (requestId) {
      this.response.meta = { ...this.response.meta, requestId };
    }
  }

  success(data: any): ResponseBuilder {
    this.response.success = true;
    this.data = data;
    this.error = undefined;
    return this;
  }

  error(error: AppError | Error): ResponseBuilder {
    this.response.success = false;
    this.error = error instanceof AppError ? error.toJSON() : { 
      code: 'INTERNAL_ERROR', 
      message: error.message 
    };
    this.data = null;
    this.statusCode = error instanceof AppError ? error.statusCode : 500;
    return this;
  }

  status(code: number): ResponseBuilder {
    this.statusCode = code;
    return this;
  }

  meta(meta: Partial<ApiResponse['meta']>): ResponseBuilder {
    this.response.meta = { ...this.response.meta, ...meta };
    return this;
  }

  build(): Response {
    const body = JSON.stringify({
      ...this.response,
      ...(this.data !== undefined && { data: this.data }),
      ...(this.error && { error: this.error }),
    });

    return new Response(body, {
      status: this.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': this.response.meta?.requestId || generateRequestId(),
      },
    });
  }
}