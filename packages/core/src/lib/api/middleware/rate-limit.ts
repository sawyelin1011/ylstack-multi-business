/**
 * Rate Limiting Middleware
 * Implements rate limiting to protect against abuse and ensure fair API usage
 */

import type { Context } from 'hono';
import { getServerConfig } from '../../config';
import { RateLimitError } from '../errors';

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  enabled: boolean;
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator: 'ip' | 'user' | 'custom';
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  keyGeneratorFn?: (ctx: Context) => string;
}

/**
 * Rate limit store entry
 */
interface RateLimitEntry {
  count: number;
  windowStart: number;
  resetTime: number;
}

/**
 * Default rate limiting configuration
 */
const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  enabled: true,
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: 'ip',
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
};

/**
 * Get rate limiting configuration from server config
 */
function getRateLimitConfig(): RateLimitConfig {
  try {
    const serverConfig = getServerConfig();
    return {
      ...DEFAULT_RATE_LIMIT_CONFIG,
      ...serverConfig.rateLimit,
    };
  } catch {
    // Fallback to defaults if config is not available
    return DEFAULT_RATE_LIMIT_CONFIG;
  }
}

/**
 * Get rate limiting store (simple in-memory store)
 * In production, this should be replaced with Redis or similar
 */
function getRateLimitStore(): Map<string, RateLimitEntry> {
  const store = (globalThis as any).__RATE_LIMIT_STORE__;
  if (!store) {
    const newStore = new Map<string, RateLimitEntry>();
    (globalThis as any).__RATE_LIMIT_STORE__ = newStore;
    return newStore;
  }
  return store;
}

/**
 * Clean up expired entries from rate limit store
 */
function cleanupExpiredEntries(store: Map<string, RateLimitEntry>, now: number, windowMs: number): void {
  const cutoff = now - windowMs * 2; // Clean up entries older than 2 windows
  
  for (const [key, entry] of store.entries()) {
    if (entry.windowStart < cutoff) {
      store.delete(key);
    }
  }
}

/**
 * Generate rate limit key based on configuration
 */
function generateRateLimitKey(ctx: Context, config: RateLimitConfig): string {
  if (config.keyGeneratorFn) {
    return config.keyGeneratorFn(ctx);
  }
  
  switch (config.keyGenerator) {
    case 'user':
      // This would need to be implemented when auth is added
      const userId = ctx.get('userId') || 'anonymous';
      return `user:${userId}`;
      
    case 'custom':
      // Custom key generation would be implemented here
      return `custom:${getClientIP(ctx)}`;
      
    case 'ip':
    default:
      return `ip:${getClientIP(ctx)}`;
  }
}

/**
 * Get client IP address for rate limiting
 */
function getClientIP(ctx: Context): string {
  const headers = [
    'x-forwarded-for',
    'x-real-ip', 
    'x-client-ip',
    'cf-connecting-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];
  
  for (const header of headers) {
    const ip = ctx.req.header(header);
    if (ip) {
      const ips = ip.split(',').map(ip => ip.trim());
      return ips[0];
    }
  }
  
  // Fallback to connection info
  const conn = ctx.req as any;
  if (conn?.ip) {
    return conn.ip;
  }
  
  return 'unknown';
}

/**
 * Rate limiting middleware
 * Implements sliding window rate limiting with in-memory storage
 */
export async function rateLimitMiddleware(ctx: Context, next: () => Promise<void>): Promise<void> {
  const config = getRateLimitConfig();
  
  // Skip if rate limiting is disabled
  if (!config.enabled) {
    await next();
    return;
  }
  
  const store = getRateLimitStore();
  const now = Date.now();
  
  // Clean up expired entries
  cleanupExpiredEntries(store, now, config.windowMs);
  
  // Generate rate limit key
  const key = generateRateLimitKey(ctx, config);
  
  // Get or create rate limit entry
  let entry = store.get(key);
  const windowStart = now - (now % config.windowMs);
  
  if (!entry || entry.windowStart < windowStart) {
    // Create new window entry
    entry = {
      count: 0,
      windowStart,
      resetTime: windowStart + config.windowMs,
    };
  }
  
  // Increment request count
  entry.count++;
  
  // Store updated entry
  store.set(key, entry);
  
  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    
    // Set rate limit headers
    if (config.standardHeaders) {
      ctx.header('X-RateLimit-Limit', config.maxRequests.toString());
      ctx.header('X-RateLimit-Remaining', '0');
      ctx.header('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());
    }
    
    if (config.legacyHeaders) {
      ctx.header('X-RateLimit-Limit', config.maxRequests.toString());
      ctx.header('X-RateLimit-Remaining', '0');
      ctx.header('Retry-After', retryAfter.toString());
    }
    
    // Throw rate limit error
    throw new RateLimitError(config.message, {
      limit: config.maxRequests,
      window: `${config.windowMs}ms`,
      retryAfter,
    });
  }
  
  // Set rate limit headers
  if (config.standardHeaders) {
    const remaining = config.maxRequests - entry.count;
    ctx.header('X-RateLimit-Limit', config.maxRequests.toString());
    ctx.header('X-RateLimit-Remaining', remaining.toString());
    ctx.header('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());
  }
  
  if (config.legacyHeaders) {
    ctx.header('X-RateLimit-Limit', config.maxRequests.toString());
    ctx.header('X-RateLimit-Remaining', (config.maxRequests - entry.count).toString());
  }
  
  await next();
}

/**
 * Create a custom rate limiting middleware
 */
export function createRateLimitMiddleware(config: Partial<RateLimitConfig>): (ctx: Context, next: Next) => Promise<void> {
  const rateLimitConfig = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
  
  return async (ctx: Context, next: Next) => {
    // Skip if rate limiting is disabled
    if (!rateLimitConfig.enabled) {
      await next();
      return;
    }
    
    const store = getRateLimitStore();
    const now = Date.now();
    
    // Clean up expired entries
    cleanupExpiredEntries(store, now, rateLimitConfig.windowMs);
    
    // Generate rate limit key
    const key = rateLimitConfig.keyGeneratorFn 
      ? rateLimitConfig.keyGeneratorFn(ctx)
      : generateRateLimitKey(ctx, rateLimitConfig);
    
    // Get or create rate limit entry
    let entry = store.get(key);
    const windowStart = now - (now % rateLimitConfig.windowMs);
    
    if (!entry || entry.windowStart < windowStart) {
      entry = {
        count: 0,
        windowStart,
        resetTime: windowStart + rateLimitConfig.windowMs,
      };
    }
    
    entry.count++;
    store.set(key, entry);
    
    // Check if limit exceeded
    if (entry.count > rateLimitConfig.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      if (rateLimitConfig.standardHeaders) {
        ctx.header('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString());
        ctx.header('X-RateLimit-Remaining', '0');
        ctx.header('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());
      }
      
      throw new RateLimitError(rateLimitConfig.message, {
        limit: rateLimitConfig.maxRequests,
        window: `${rateLimitConfig.windowMs}ms`,
        retryAfter,
      });
    }
    
    // Set rate limit headers
    if (rateLimitConfig.standardHeaders) {
      const remaining = rateLimitConfig.maxRequests - entry.count;
      ctx.header('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString());
      ctx.header('X-RateLimit-Remaining', remaining.toString());
      ctx.header('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());
    }
    
    await next();
  };
}

/**
 * Rate limiting utilities
 */
export const RateLimitUtils = {
  /**
   * Get current usage for a key
   */
  getUsage(ctx: Context, key: string): { count: number; resetTime: number; remaining: number } | null {
    const store = getRateLimitStore();
    const entry = store.get(key);
    
    if (!entry) {
      return null;
    }
    
    const config = getRateLimitConfig();
    const now = Date.now();
    const windowStart = now - (now % config.windowMs);
    
    // If entry is from a previous window, it's effectively expired
    if (entry.windowStart < windowStart) {
      return null;
    }
    
    return {
      count: entry.count,
      resetTime: entry.resetTime,
      remaining: Math.max(0, config.maxRequests - entry.count),
    };
  },
  
  /**
   * Reset rate limit for a key
   */
  reset(ctx: Context, key: string): boolean {
    const store = getRateLimitStore();
    return store.delete(key);
  },
  
  /**
   * Get all current rate limit entries (for monitoring)
   */
  getAllEntries(): Map<string, RateLimitEntry> {
    return getRateLimitStore();
  },
  
  /**
   * Clear all rate limit entries
   */
  clearAll(): void {
    const store = getRateLimitStore();
    store.clear();
  },
};