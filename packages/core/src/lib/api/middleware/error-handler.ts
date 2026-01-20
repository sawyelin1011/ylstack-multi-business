/**
 * Global Error Handler Middleware
 * Catches and handles all errors that occur during request processing
 */

import type { Context } from 'hono';
import { AppError, ErrorUtils } from '../errors';
import { errorResponse } from '../responses';
import { createRequestLogger } from '../../logger';
import { getRequestId } from './request-id';

/**
 * Error handler middleware
 * Catches all errors and converts them to proper API responses
 */
export async function errorHandlerMiddleware(ctx: Context, next: () => Promise<void>): Promise<void> {
  try {
    await next();
  } catch (error) {
    const requestId = getRequestId(ctx);
    const logger = createRequestLogger(requestId, {
      method: ctx.req.method,
      path: ctx.req.path,
    });

    // Log the error
    if (error instanceof AppError) {
      logger.warn('Operational error occurred', {
        error: error.toJSON(),
        statusCode: error.statusCode,
        code: error.code,
        isOperational: error.isOperational,
      });
    } else {
      logger.error('Unexpected error occurred', error, {
        errorType: error?.constructor?.name,
        stack: error instanceof Error ? error.stack : undefined,
      });
    }

    // Convert error to API response
    const response = convertErrorToResponse(error, ctx);
    
    // Send the response
    ctx.res = response;
  }
}

/**
 * Convert an error to an appropriate API response
 */
function convertErrorToResponse(error: unknown, ctx: Context): Response {
  const requestId = getRequestId(ctx);
  const isProduction = process.env.NODE_ENV === 'production';
  
  let appError: AppError;
  
  // Convert to AppError if needed
  if (error instanceof AppError) {
    appError = error;
  } else {
    appError = ErrorUtils.toAppError(error);
  }
  
  // Sanitize error for production (remove sensitive information)
  const responseError = isProduction && !appError.isOperational
    ? ErrorUtils.sanitizeForProduction(appError)
    : appError;
  
  // Create error response
  const response = errorResponse(responseError, {
    requestId,
  });
  
  // Convert to Response object
  const responseBody = JSON.stringify(response);
  
  return new Response(responseBody, {
    status: responseError.statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

/**
 * Create a custom error handler middleware
 */
export function createErrorHandlerMiddleware(
  options: {
    includeStackTrace?: boolean;
    logErrors?: boolean;
    includeOriginalError?: boolean;
    onError?: (error: AppError, ctx: Context) => void;
  } = {}
): (ctx: Context, next: () => Promise<void>) => Promise<void> {
  const {
    includeStackTrace = false,
    logErrors = true,
    includeOriginalError = false,
    onError,
  } = options;
  
  return async (ctx: Context, next: Next) => {
    try {
      await next();
    } catch (error) {
      const requestId = getRequestId(ctx);
      const logger = createRequestLogger(requestId, {
        method: ctx.req.method,
        path: ctx.req.path,
      });
      
      // Convert to AppError
      const appError = error instanceof AppError 
        ? error 
        : ErrorUtils.toAppError(error);
      
      // Log error if enabled
      if (logErrors) {
        if (appError.isOperational) {
          logger.warn('Operational error occurred', {
            error: appError.toJSON(),
            includeOriginalError,
          });
        } else {
          logger.error('Unexpected error occurred', error, {
            errorType: error?.constructor?.name,
            includeStackTrace,
            stack: includeStackTrace ? (error instanceof Error ? error.stack : undefined) : undefined,
          });
        }
      }
      
      // Call custom error handler
      if (onError) {
        try {
          onError(appError, ctx);
        } catch (handlerError) {
          logger.error('Error in custom error handler', handlerError);
        }
      }
      
      // Sanitize error for production
      const isProduction = process.env.NODE_ENV === 'production';
      const responseError = isProduction && !appError.isOperational
        ? ErrorUtils.sanitizeForProduction(appError)
        : appError;
      
      // Create and send response
      const response = errorResponse(responseError, {
        requestId,
        ...(includeStackTrace && !isProduction && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      });
      
      ctx.res = new Response(JSON.stringify(response), {
        status: responseError.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }
  };
}

/**
 * Async error wrapper
 * Wraps async functions to catch errors automatically
 */
export function asyncHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      throw ErrorUtils.toAppError(error);
    }
  };
}

/**
 * Sync error wrapper
 * Wraps sync functions to catch errors automatically
 */
export function syncHandler<T extends any[], R>(
  handler: (...args: T) => R
): (...args: T) => R {
  return (...args: T): R => {
    try {
      return handler(...args);
    } catch (error) {
      throw ErrorUtils.toAppError(error);
    }
  };
}

/**
 * Error context for more detailed error handling
 */
export interface ErrorContext {
  requestId: string;
  method: string;
  path: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  additionalContext?: Record<string, any>;
}

/**
 * Enhanced error handler with detailed context
 */
export class ErrorHandler {
  private logger = createRequestLogger('error-handler');
  
  /**
   * Handle error with detailed context
   */
  handle(error: unknown, context: ErrorContext): Response {
    const { requestId, method, path, userAgent, ip, userId, additionalContext } = context;
    
    // Create logger with request context
    const logger = createRequestLogger(requestId, {
      method,
      path,
      userAgent,
      ip,
      userId,
    });
    
    // Convert to AppError
    const appError = error instanceof AppError 
      ? error 
      : ErrorUtils.toAppError(error);
    
    // Log error with context
    if (appError.isOperational) {
      logger.warn('Operational error occurred', {
        error: appError.toJSON(),
        additionalContext,
      });
    } else {
      logger.error('Unexpected error occurred', error, {
        errorType: error?.constructor?.name,
        additionalContext,
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
    
    // Sanitize for production
    const isProduction = process.env.NODE_ENV === 'production';
    const responseError = isProduction && !appError.isOperational
      ? ErrorUtils.sanitizeForProduction(appError)
      : appError;
    
    // Create response
    const response = errorResponse(responseError, {
      requestId,
      ...additionalContext,
    });
    
    return new Response(JSON.stringify(response), {
      status: responseError.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
  
  /**
   * Handle error in middleware context
   */
  async handleInMiddleware(ctx: Context, error: unknown): Promise<void> {
    const requestId = getRequestId(ctx);
    const context: ErrorContext = {
      requestId,
      method: ctx.req.method,
      path: ctx.req.path,
      userAgent: ctx.req.header('user-agent'),
      userId: ctx.get('userId'),
      additionalContext: {
        query: ctx.req.query(),
        params: ctx.req.param(),
      },
    };
    
    const response = this.handle(error, context);
    ctx.res = response;
  }
}