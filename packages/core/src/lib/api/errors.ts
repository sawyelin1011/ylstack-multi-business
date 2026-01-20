/**
 * API Error Classes
 * Comprehensive error types for the application with proper HTTP status codes
 */

/**
 * Base application error class
 */
export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly context?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    context?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.context = context;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to a JSON-serializable object for API responses
   */
  toJSON(): {
    code: string;
    message: string;
    context?: Record<string, any>;
    statusCode: number;
  } {
    return {
      code: this.code,
      message: this.message,
      context: this.context,
      statusCode: this.statusCode,
    };
  }
}

/**
 * 400 Bad Request - Invalid input data
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    context?: {
      field?: string;
      fields?: Record<string, string[]>;
      details?: string;
    }
  ) {
    super(message, 400, 'VALIDATION_ERROR', context);
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
export class UnauthorizedError extends AppError {
  constructor(
    message: string = 'Authentication required',
    context?: Record<string, any>
  ) {
    super(message, 401, 'UNAUTHORIZED', context);
  }
}

/**
 * 403 Forbidden - Insufficient permissions
 */
export class ForbiddenError extends AppError {
  constructor(
    message: string = 'Insufficient permissions',
    context?: {
      required?: string | string[];
      user?: {
        id?: string;
        roles?: string[];
        permissions?: string[];
      };
    }
  ) {
    super(message, 403, 'FORBIDDEN', context);
  }
}

/**
 * 404 Not Found - Resource not found
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string,
    context?: {
      resourceType?: string;
      resourceId?: string;
      searchParams?: Record<string, any>;
    }
  ) {
    const message = `${resource} not found`;
    super(message, 404, 'NOT_FOUND', context);
  }
}

/**
 * 409 Conflict - Resource conflict
 */
export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource conflict',
    context?: {
      resource?: string;
      conflictingId?: string;
      details?: string;
    }
  ) {
    super(message, 409, 'CONFLICT', context);
  }
}

/**
 * 422 Unprocessable Entity - Semantic validation failed
 */
export class UnprocessableEntityError extends AppError {
  constructor(
    message: string = 'Unprocessable entity',
    context?: Record<string, any>
  ) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', context);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    context?: {
      limit?: number;
      window?: string;
      retryAfter?: number;
    }
  ) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', context);
  }
}

/**
 * 500 Internal Server Error - Server error
 */
export class InternalError extends AppError {
  constructor(
    message: string = 'Internal server error',
    context?: {
      operation?: string;
      details?: string;
    },
    isOperational: boolean = false
  ) {
    super(message, 500, 'INTERNAL_ERROR', context, isOperational);
  }
}

/**
 * 502 Bad Gateway - Upstream service error
 */
export class BadGatewayError extends AppError {
  constructor(
    message: string = 'Bad gateway',
    context?: {
      service?: string;
      details?: string;
    }
  ) {
    super(message, 502, 'BAD_GATEWAY', context);
  }
}

/**
 * 503 Service Unavailable - Service temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message: string = 'Service unavailable',
    context?: {
      service?: string;
      retryAfter?: number;
    }
  ) {
    super(message, 503, 'SERVICE_UNAVAILABLE', context);
  }
}

/**
 * Error utility functions
 */
export const ErrorUtils = {
  /**
   * Convert any error to an AppError
   */
  toAppError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new InternalError(error.message, { originalError: error.message }, false);
    }

    return new InternalError('Unknown error occurred', { originalError: String(error) }, false);
  },

  /**
   * Check if error is an operational error (expected)
   */
  isOperationalError(error: unknown): error is AppError {
    return error instanceof AppError && error.isOperational;
  },

  /**
   * Get HTTP status code from error
   */
  getStatusCode(error: unknown): number {
    if (error instanceof AppError) {
      return error.statusCode;
    }
    return 500;
  },

  /**
   * Get error code from error
   */
  getErrorCode(error: unknown): string {
    if (error instanceof AppError) {
      return error.code;
    }
    return 'UNKNOWN_ERROR';
  },

  /**
   * Sanitize error for production (remove sensitive information)
   */
  sanitizeForProduction(error: unknown): AppError {
    if (error instanceof AppError) {
      // Create a new error without sensitive context
      return new InternalError(
        'An error occurred',
        { 
          code: error.code,
          // Don't expose internal details in production
        },
        error.isOperational
      );
    }

    return new InternalError('An error occurred', undefined, false);
  },
};

/**
 * Error code constants
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_GATEWAY: 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;