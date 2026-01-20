/**
 * API Application Context - Simplified
 * Defines the context available to all route handlers and middleware
 */

import type { Database as DbClient } from '../db';
import type { Config } from '../config';
import type { Logger } from '../logger';

// User payload type (will be populated by authentication middleware)
export interface UserPayload {
  id: string;
  email: string;
  roles?: string[];
  permissions?: string[];
  isAdmin?: boolean;
  metadata?: Record<string, any>;
}

// Application context interface
export interface AppContext {
  db: DbClient;
  config: Config;
  logger: Logger;
  requestId: string;
  startTime: number;
  user?: UserPayload;
  validated?: {
    body?: any;
    query?: any;
    params?: any;
    headers?: any;
  };
  metadata?: Record<string, any>;
}

// Simplified context utilities for practical use
export const ContextUtils = {
  /**
   * Get user from context (safe getter)
   */
  getUser(ctx: any): UserPayload | undefined {
    return ctx.get('user');
  },

  /**
   * Get database from context (safe getter)
   */
  getDatabase(ctx: any): DbClient {
    return ctx.get('db');
  },

  /**
   * Get logger from context (safe getter)
   */
  getLogger(ctx: any): Logger {
    return ctx.get('logger');
  },

  /**
   * Get request ID from context (safe getter)
   */
  getRequestId(ctx: any): string {
    return ctx.get('requestId');
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(ctx: any): boolean {
    const user = ContextUtils.getUser(ctx);
    return !!user;
  },

  /**
   * Check if user has required role
   */
  hasRole(ctx: any, role: string): boolean {
    const user = ContextUtils.getUser(ctx);
    return !!user?.roles?.includes(role);
  },

  /**
   * Check if user has required permission
   */
  hasPermission(ctx: any, permission: string): boolean {
    const user = ContextUtils.getUser(ctx);
    return !!user?.permissions?.includes(permission);
  },

  /**
   * Check if user is admin
   */
  isAdmin(ctx: any): boolean {
    const user = ContextUtils.getUser(ctx);
    return !!user?.isAdmin || ContextUtils.hasRole(ctx, 'admin');
  },

  /**
   * Create child logger with additional context
   */
  createChildLogger(ctx: any, additionalContext: Record<string, any>): Logger {
    const logger = ContextUtils.getLogger(ctx);
    const requestId = ContextUtils.getRequestId(ctx);
    
    return logger.child({
      requestId,
      ...additionalContext,
    });
  },
};