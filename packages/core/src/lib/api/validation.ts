/**
 * Request Validation Middleware
 * Validates HTTP requests using Zod schemas
 */

import { z } from 'zod';
import type { Context } from 'hono';
import { ValidationError } from './errors';
import type { LogContext } from '../logger';

/**
 * Middleware type for Hono handlers
 */
export type HonoMiddleware = (ctx: Context, next: () => Promise<void>) => Promise<void>;

/**
 * Validation middleware for request body
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>
): HonoMiddleware {
  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      // Get the request body
      let body: any;
      const contentType = ctx.req.header('content-type') || '';
      
      if (contentType.includes('application/json')) {
        body = await ctx.req.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        body = Object.fromEntries(await ctx.req.formData());
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await ctx.req.formData();
        body = Object.fromEntries(formData.entries());
      } else {
        // Try to parse as JSON anyway, fallback to empty object
        try {
          body = await ctx.req.json();
        } catch {
          body = {};
        }
      }

      // Validate the body
      const result = schema.safeParse(body);
      
      if (!result.success) {
        throw new ValidationError('Request body validation failed', {
          fields: formatZodErrors(result.error.issues),
          details: 'Invalid data provided in request body',
        });
      }

      // Attach validated data to context
      ctx.set('validatedBody', result.data);
      ctx.set('rawBody', body);
      
      await next();
    } catch (error) {
      // If it's already a ValidationError, re-throw it
      if (error instanceof ValidationError) {
        throw error;
      }
      
      // If it's a Zod validation error, convert it
      if (error instanceof z.ZodError) {
        throw new ValidationError('Request body validation failed', {
          fields: formatZodErrors(error.issues),
          details: 'Invalid data provided in request body',
        });
      }
      
      // For other errors, wrap in ValidationError
      throw new ValidationError('Invalid request body', {
        details: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

/**
 * Validation middleware for query parameters
 */
export function validateQuery<T>(
  schema: z.ZodSchema<T>
): HonoMiddleware {
  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      const url = new URL(ctx.req.url);
      const queryParams: Record<string, any> = {};
      
      // Handle array parameters (e.g., tags=a&tags=b)
      url.searchParams.forEach((value, key) => {
        if (queryParams[key]) {
          // Convert to array if multiple values
          const allValues = url.searchParams.getAll(key);
          if (allValues.length > 1) {
            queryParams[key] = allValues;
          } else {
            queryParams[key] = value;
          }
        } else {
          queryParams[key] = value;
        }
      });

      // Validate the query parameters
      const result = schema.safeParse(queryParams);
      
      if (!result.success) {
        throw new ValidationError('Query parameters validation failed', {
          fields: formatZodErrors(result.error.issues),
          details: 'Invalid query parameters provided',
        });
      }

      // Attach validated data to context
      ctx.set('validatedQuery', result.data);
      ctx.set('rawQuery', queryParams);
      
      await next();
    } catch (error) {
      // If it's already a ValidationError, re-throw it
      if (error instanceof ValidationError) {
        throw error;
      }
      
      // If it's a Zod validation error, convert it
      if (error instanceof z.ZodError) {
        throw new ValidationError('Query parameters validation failed', {
          fields: formatZodErrors(error.issues),
          details: 'Invalid query parameters provided',
        });
      }
      
      // For other errors, wrap in ValidationError
      throw new ValidationError('Invalid query parameters', {
        details: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

/**
 * Validation middleware for URL path parameters
 */
export function validateParams<T>(
  schema: z.ZodSchema<T>
): HonoMiddleware {
  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      const params = ctx.req.param();
      
      // Validate the path parameters
      const result = schema.safeParse(params);
      
      if (!result.success) {
        throw new ValidationError('Path parameters validation failed', {
          fields: formatZodErrors(result.error.issues),
          details: 'Invalid path parameters provided',
        });
      }

      // Attach validated data to context
      ctx.set('validatedParams', result.data);
      ctx.set('rawParams', params);
      
      await next();
    } catch (error) {
      // If it's already a ValidationError, re-throw it
      if (error instanceof ValidationError) {
        throw error;
      }
      
      // If it's a Zod validation error, convert it
      if (error instanceof z.ZodError) {
        throw new ValidationError('Path parameters validation failed', {
          fields: formatZodErrors(error.issues),
          details: 'Invalid path parameters provided',
        });
      }
      
      // For other errors, wrap in ValidationError
      throw new ValidationError('Invalid path parameters', {
        details: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

/**
 * Combined validation middleware for body, query, and params
 */
export function validate<TBody = any, TQuery = any, TParams = any>(
  bodySchema?: z.ZodSchema<TBody>,
  querySchema?: z.ZodSchema<TQuery>,
  paramsSchema?: z.ZodSchema<TParams>
): HonoMiddleware {
  const middlewares: HonoMiddleware[] = [];
  
  if (paramsSchema) {
    middlewares.push(validateParams(paramsSchema));
  }
  
  if (querySchema) {
    middlewares.push(validateQuery(querySchema));
  }
  
  if (bodySchema) {
    middlewares.push(validateBody(bodySchema));
  }
  
  // Return composed middleware
  return async (ctx: Context, next: () => Promise<void>) => {
    for (const middleware of middlewares) {
      await middleware(ctx, async () => {});
    }
    await next();
  };
}

/**
 * Validation helper for headers
 */
export function validateHeaders<T>(
  schema: z.ZodSchema<T>
): HonoMiddleware {
  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      const headers: Record<string, string> = {};
      for (const [key, value] of ctx.req.headers) {
        headers[key] = value;
      }
      
      // Validate the headers
      const result = schema.safeParse(headers);
      
      if (!result.success) {
        throw new ValidationError('Headers validation failed', {
          fields: formatZodErrors(result.error.issues),
          details: 'Invalid headers provided',
        });
      }

      // Attach validated data to context
      ctx.set('validatedHeaders', result.data);
      
      await next();
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      
      if (error instanceof z.ZodError) {
        throw new ValidationError('Headers validation failed', {
          fields: formatZodErrors(error.issues),
          details: 'Invalid headers provided',
        });
      }
      
      throw new ValidationError('Invalid headers', {
        details: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

/**
 * Helper to get validated data from context
 */
export function getValidatedBody<T>(ctx: Context): T {
  return ctx.get('validatedBody');
}

export function getValidatedQuery<T>(ctx: Context): T {
  return ctx.get('validatedQuery');
}

export function getValidatedParams<T>(ctx: Context): T {
  return ctx.get('validatedParams');
}

export function getValidatedHeaders<T>(ctx: Context): T {
  return ctx.get('validatedHeaders');
}

/**
 * Helper to get raw (unvalidated) data from context
 */
export function getRawBody(ctx: Context): any {
  return ctx.get('rawBody');
}

export function getRawQuery(ctx: Context): any {
  return ctx.get('rawQuery');
}

export function getRawParams(ctx: Context): any {
  return ctx.get('rawParams');
}

/**
 * Format Zod validation errors into a more useful structure
 */
function formatZodErrors(errors: z.ZodIssue[]): Record<string, string[]> {
  const formattedErrors: Record<string, string[]> = {};
  
  for (const error of errors) {
    const path = error.path.join('.') || 'root';
    
    if (!formattedErrors[path]) {
      formattedErrors[path] = [];
    }
    
    formattedErrors[path].push(error.message);
  }
  
  return formattedErrors;
}

/**
 * Common validation schemas for reuse
 */
export const CommonSchemas = {
  /**
   * UUID validation schema
   */
  uuid: z.string().uuid('Invalid UUID format'),
  
  /**
   * Email validation schema
   */
  email: z.string().email('Invalid email format'),
  
  /**
   * Pagination schema
   */
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
  
  /**
   * Date range schema
   */
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
  
  /**
   * Sort order schema
   */
  sort: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
};

/**
 * Create a validation middleware with custom error handling
 */
export function createValidationMiddleware<T>(
  schema: z.ZodSchema<T>,
  options: {
    source: 'body' | 'query' | 'params' | 'headers';
    onSuccess?: (data: T, ctx: Context) => void;
    onError?: (error: ValidationError, ctx: Context) => void;
  }
): HonoMiddleware {
  const { source, onSuccess, onError } = options;
  
  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      let result: { success: boolean; data?: T; error?: any };
      
      switch (source) {
        case 'body':
          try {
            const body = await ctx.req.json();
            result = schema.safeParse(body);
          } catch {
            result = { success: false, error: new Error('Invalid JSON') };
          }
          break;
        case 'query':
          const url = new URL(ctx.req.url);
          const query = Object.fromEntries(url.searchParams.entries());
          result = schema.safeParse(query);
          break;
        case 'params':
          result = schema.safeParse(ctx.req.param());
          break;
        case 'headers':
          const headers: Record<string, string> = {};
          for (const [key, value] of ctx.req.headers) {
            headers[key] = value;
          }
          result = schema.safeParse(headers);
          break;
        default:
          throw new Error(`Unknown validation source: ${source}`);
      }
      
      if (!result.success) {
        throw new ValidationError(`${source} validation failed`, {
          fields: result.error?.issues ? formatZodErrors(result.error.issues) : {},
        });
      }
      
      // Attach validated data
      ctx.set(`validated${source.charAt(0).toUpperCase() + source.slice(1)}`, result.data);
      
      if (onSuccess) {
        onSuccess(result.data, ctx);
      }
      
      await next();
    } catch (error) {
      if (error instanceof ValidationError && onError) {
        onError(error, ctx);
        return;
      }
      
      throw error;
    }
  };
}