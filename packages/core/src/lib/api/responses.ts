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

export interface SuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data?: T;
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

export interface PaginatedResponse<T = any> extends SuccessResponse<{ items: T[]; pagination: PaginationMetadata }> {
  data: {
    items: T[];
    pagination: PaginationMetadata;
  };
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
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
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
        ...(pagination.hasNext !== undefined && { hasNext: pagination.hasNext }),
        ...(pagination.hasPrev !== undefined && { hasPrev: pagination.hasPrev }),
      },
    },
    meta: createMeta({
      requestId,
      duration: meta?.duration,
      ...(meta && Object.keys(meta).length > 0 && { ...meta })
    }),
  };
}

/**
 * Response Builder for fluent response construction
 */
export class ResponseBuilder {
  private response: ApiResponse<any>;
  private data?: any;
  private error?: any;
  private statusCode: number = 200;

  constructor(requestId?: string) {
    this.response = {
      success: true,
      meta: createMeta({ requestId: requestId || generateRequestId() }),
    };
  }

  requestId(id: string): ResponseBuilder {
    this.response.meta = { ...this.response.meta, requestId };
    return this;
  }

  duration(ms: number): ResponseBuilder {
    this.response.meta.duration = ms;
    return this;
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

/**
 * Utility functions for response handling
 */
export const ResponseUtils = {
  json<T>(data: T, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  text(text: string, status: number = 200): Response {
    return new Response(text, {
      status,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  },

  html(html: string, status: number = 200): Response {
    return new Response(html, {
      status,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  },

  redirect(location: string, status: number = 302): Response {
    return new Response(null, {
      status,
      headers: {
        'Location': location,
      },
    });
  },

  file(content: Blob, filename: string): Response {
    return new Response(content, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  },
};

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
