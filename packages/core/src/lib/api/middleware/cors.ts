/**
 * CORS (Cross-Origin Resource Sharing) Middleware
 * Handles CORS preflight requests and adds CORS headers to responses
 */

import type { Context } from 'hono';
import { getServerConfig } from '../../config';

/**
 * CORS configuration interface
 */
interface CorsConfig {
  enabled: boolean;
  origin: string | boolean | string[];
  methods: string;
  headers: string;
  credentials: boolean;
  maxAge?: number;
}

/**
 * Default CORS configuration
 */
const DEFAULT_CORS_CONFIG: CorsConfig = {
  enabled: true,
  origin: '*',
  methods: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  headers: 'Content-Type, Authorization, X-Request-ID',
  credentials: false,
  maxAge: 86400, // 24 hours
};

/**
 * Get CORS configuration from server config
 */
function getCorsConfig(): CorsConfig {
  try {
    const serverConfig = getServerConfig();
    return {
      ...DEFAULT_CORS_CONFIG,
      ...serverConfig.cors,
    };
  } catch {
    // Fallback to defaults if config is not available
    return DEFAULT_CORS_CONFIG;
  }
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string, allowedOrigins: string | boolean | string[]): boolean {
  if (allowedOrigins === '*' || allowedOrigins === true) {
    return true;
  }
  
  if (typeof allowedOrigins === 'string') {
    return origin === allowedOrigins;
  }
  
  if (Array.isArray(allowedOrigins)) {
    return allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === '*') {
        return true;
      }
      
      // Support wildcard patterns
      if (allowedOrigin.startsWith('*.') && origin.endsWith(allowedOrigin.substring(1))) {
        return true;
      }
      
      if (allowedOrigin.includes('*')) {
        const pattern = new RegExp(allowedOrigin.replace(/\*/g, '.*'));
        return pattern.test(origin);
      }
      
      return origin === allowedOrigin;
    });
  }
  
  return false;
}

/**
 * CORS middleware
 * Handles preflight requests and adds CORS headers
 */
export async function corsMiddleware(ctx: Context, next: () => Promise<void>): Promise<void> {
  const config = getCorsConfig();
  
  // Skip if CORS is disabled
  if (!config.enabled) {
    await next();
    return;
  }
  
  const origin = ctx.req.header('origin');
  const requestMethod = ctx.req.method;
  const requestHeaders = ctx.req.header('access-control-request-headers');
  
  // Handle preflight requests
  if (requestMethod === 'OPTIONS' && (origin || ctx.req.header('access-control-request-method'))) {
    return handlePreflightRequest(ctx, config, origin || '', requestHeaders || '');
  }
  
  // Add CORS headers to actual requests
  if (origin && isOriginAllowed(origin, config.origin)) {
    ctx.header('Access-Control-Allow-Origin', origin === '*' ? origin : origin);
    ctx.header('Vary', 'Origin');
  }
  
  // Add credentials header if configured
  if (config.credentials) {
    ctx.header('Access-Control-Allow-Credentials', 'true');
  }
  
  // Add other CORS headers
  ctx.header('Access-Control-Allow-Methods', config.methods);
  ctx.header('Access-Control-Allow-Headers', config.headers);
  
  if (config.maxAge) {
    ctx.header('Access-Control-Max-Age', config.maxAge.toString());
  }
  
  await next();
}

/**
 * Handle CORS preflight requests
 */
function handlePreflightRequest(
  ctx: Context,
  config: CorsConfig,
  origin: string,
  requestHeaders: string
): Response {
  const responseHeaders: Record<string, string> = {};
  
  // Set allowed origin
  if (isOriginAllowed(origin, config.origin)) {
    responseHeaders['Access-Control-Allow-Origin'] = origin === '*' ? origin : origin;
    responseHeaders['Vary'] = 'Origin';
  }
  
  // Set allowed methods
  responseHeaders['Access-Control-Allow-Methods'] = config.methods;
  
  // Set allowed headers
  responseHeaders['Access-Control-Allow-Headers'] = requestHeaders || config.headers;
  
  // Set max age
  if (config.maxAge) {
    responseHeaders['Access-Control-Max-Age'] = config.maxAge.toString();
  }
  
  // Set credentials
  if (config.credentials) {
    responseHeaders['Access-Control-Allow-Credentials'] = 'true';
  }
  
  // Add expose headers if configured
  responseHeaders['Access-Control-Expose-Headers'] = 'Content-Type, Authorization, X-Request-ID, X-Response-Time';
  
  return new Response(null, {
    status: 204,
    headers: responseHeaders,
  });
}

/**
 * Create a custom CORS middleware with specific configuration
 */
export function createCorsMiddleware(config: Partial<CorsConfig>): (ctx: Context, next: Next) => Promise<void> {
  const corsConfig = { ...DEFAULT_CORS_CONFIG, ...config };
  
  return async (ctx: Context, next: Next) => {
    const origin = ctx.req.header('origin');
    const requestMethod = ctx.req.method;
    const requestHeaders = ctx.req.header('access-control-request-headers');
    
    // Handle preflight requests
    if (requestMethod === 'OPTIONS' && (origin || ctx.req.header('access-control-request-method'))) {
      return handlePreflightRequest(ctx, corsConfig, origin || '', requestHeaders || '');
    }
    
    // Add CORS headers to actual requests
    if (origin && isOriginAllowed(origin, corsConfig.origin)) {
      ctx.header('Access-Control-Allow-Origin', origin === '*' ? origin : origin);
      ctx.header('Vary', 'Origin');
    }
    
    if (corsConfig.credentials) {
      ctx.header('Access-Control-Allow-Credentials', 'true');
    }
    
    ctx.header('Access-Control-Allow-Methods', corsConfig.methods);
    ctx.header('Access-Control-Allow-Headers', corsConfig.headers);
    
    if (corsConfig.maxAge) {
      ctx.header('Access-Control-Max-Age', corsConfig.maxAge.toString());
    }
    
    await next();
  };
}

/**
 * CORS utility functions
 */
export const CorsUtils = {
  /**
   * Check if request is a CORS preflight request
   */
  isPreflightRequest(ctx: Context): boolean {
    return ctx.req.method === 'OPTIONS' && !!ctx.req.header('origin');
  },
  
  /**
   * Get allowed origins
   */
  getAllowedOrigins(config: CorsConfig): string[] {
    if (config.origin === '*' || config.origin === true) {
      return ['*'];
    }
    
    if (typeof config.origin === 'string') {
      return [config.origin];
    }
    
    if (Array.isArray(config.origin)) {
      return config.origin;
    }
    
    return [];
  },
  
  /**
   * Check if credentials are allowed
   */
  allowsCredentials(config: CorsConfig): boolean {
    return config.credentials;
  },
  
  /**
   * Get CORS configuration for a specific origin
   */
  getConfigForOrigin(config: CorsConfig, origin: string): Partial<CorsConfig> | null {
    if (!isOriginAllowed(origin, config.origin)) {
      return null;
    }
    
    return {
      ...config,
      origin: origin === '*' ? origin : origin,
    };
  },
};