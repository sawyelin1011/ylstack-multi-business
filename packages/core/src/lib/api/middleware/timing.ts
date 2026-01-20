/**
 * Request Timing Middleware
 * Measures and tracks request processing time
 */

import type { Context } from 'hono';
import { getRequestId } from './request-id';

/**
 * Start time storage for performance tracking
 */
const startTimeStore = new WeakMap<Context, number>();

/**
 * Timing middleware
 * - Records start time when request is received
 * - Calculates total processing time
 * - Adds timing headers to response
 * - Includes timing in request logs
 */
export async function timingMiddleware(ctx: Context, next: () => Promise<void>): Promise<void> {
  // Record start time
  const startTime = Date.now();
  startTimeStore.set(ctx, startTime);
  
  // Add start time header for debugging
  ctx.header('X-Request-Start', startTime.toString());
  
  await next();
  
  // Calculate and record timing
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Store duration in context for use by other middleware
  ctx.set('requestDuration', duration);
  
  // Add response time header
  ctx.header('X-Response-Time', `${duration}ms`);
  
  // Add timing details to response headers for monitoring
  ctx.header('X-Timing-Details', JSON.stringify({
    start: startTime,
    end: endTime,
    duration,
  }));
}

/**
 * Get request duration from context
 */
export function getRequestDuration(ctx: Context): number {
  return ctx.get('requestDuration') || 0;
}

/**
 * Get start time from context
 */
export function getRequestStartTime(ctx: Context): number {
  return startTimeStore.get(ctx) || 0;
}

/**
 * Calculate request duration manually
 */
export function calculateRequestDuration(ctx: Context): number {
  const startTime = getRequestStartTime(ctx);
  return startTime > 0 ? Date.now() - startTime : 0;
}

/**
 * Performance monitoring helpers
 */
export const PerformanceMonitor = {
  /**
   * Measure execution time of an async operation
   */
  async measure<T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;
    
    if (operationName) {
      console.info(`Operation "${operationName}" completed in ${duration}ms`);
    }
    
    return { result, duration };
  },

  /**
   * Measure execution time of a sync operation
   */
  measureSync<T>(
    operation: () => T,
    operationName?: string
  ): { result: T; duration: number } {
    const startTime = Date.now();
    const result = operation();
    const duration = Date.now() - startTime;
    
    if (operationName) {
      console.info(`Operation "${operationName}" completed in ${duration}ms`);
    }
    
    return { result, duration };
  },

  /**
   * Create a performance timer
   */
  createTimer(operationName?: string): {
    start: () => void;
    end: () => { duration: number };
    reset: () => void;
  } {
    let startTime = 0;
    
    return {
      start() {
        startTime = Date.now();
      },
      
      end() {
        const duration = startTime > 0 ? Date.now() - startTime : 0;
        if (operationName && duration > 0) {
          console.info(`Timer "${operationName}": ${duration}ms`);
        }
        return { duration };
      },
      
      reset() {
        startTime = 0;
      },
    };
  },
};

/**
 * Slow query detector
 */
export class SlowQueryDetector {
  private static threshold = 1000; // 1 second default threshold
  
  /**
   * Set the threshold for slow query detection (in milliseconds)
   */
  static setThreshold(threshold: number): void {
    this.threshold = threshold;
  }
  
  /**
   * Check if current request is slow and log if it is
   */
  static check(ctx: Context, operation: string): void {
    const duration = getRequestDuration(ctx);
    
    if (duration >= this.threshold) {
      const requestId = getRequestId(ctx);
      console.warn(
        `Slow request detected: ${operation} took ${duration}ms (threshold: ${this.threshold}ms) [${requestId}]`
      );
    }
  }
  
  /**
   * Check if a specific operation is slow
   */
  static checkOperation(
    ctx: Context,
    operation: string,
    duration: number
  ): void {
    if (duration >= this.threshold) {
      const requestId = getRequestId(ctx);
      console.warn(
        `Slow operation detected: ${operation} took ${duration}ms (threshold: ${this.threshold}ms) [${requestId}]`
      );
    }
  }
}

/**
 * Request timing statistics
 */
export interface RequestTimingStats {
  totalRequests: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  slowRequests: number;
  requestsByEndpoint: Record<string, {
    count: number;
    averageDuration: number;
    slowCount: number;
  }>;
}

/**
 * In-memory request timing statistics (for development/monitoring)
 */
class RequestTimingStatsStore {
  private stats: RequestTimingStats = {
    totalRequests: 0,
    averageDuration: 0,
    minDuration: Infinity,
    maxDuration: 0,
    slowRequests: 0,
    requestsByEndpoint: {},
  };

  /**
   * Record a request timing
   */
  record(endpoint: string, duration: number): void {
    this.stats.totalRequests++;
    this.stats.averageDuration = 
      (this.stats.averageDuration * (this.stats.totalRequests - 1) + duration) / this.stats.totalRequests;
    
    this.stats.minDuration = Math.min(this.stats.minDuration, duration);
    this.stats.maxDuration = Math.max(this.stats.maxDuration, duration);
    
    if (duration >= SlowQueryDetector.threshold) {
      this.stats.slowRequests++;
    }
    
    if (!this.stats.requestsByEndpoint[endpoint]) {
      this.stats.requestsByEndpoint[endpoint] = {
        count: 0,
        averageDuration: 0,
        slowCount: 0,
      };
    }
    
    const endpointStats = this.stats.requestsByEndpoint[endpoint];
    endpointStats.count++;
    endpointStats.averageDuration = 
      (endpointStats.averageDuration * (endpointStats.count - 1) + duration) / endpointStats.count;
    
    if (duration >= SlowQueryDetector.threshold) {
      endpointStats.slowCount++;
    }
  }

  /**
   * Get current statistics
   */
  getStats(): RequestTimingStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.stats = {
      totalRequests: 0,
      averageDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      slowRequests: 0,
      requestsByEndpoint: {},
    };
  }
}

export const timingStats = new RequestTimingStatsStore();