/**
 * Authorization Middleware
 */

import type { Context } from 'hono';
import { hasRole, hasPermission } from '../services/rbac';
import { InsufficientRoleError, InsufficientPermissionError } from '../errors';
import { createRequestLogger } from '../../logger';

/**
 * Require specific role middleware
 */
export function requireRole(...roles: string[]) {
  return async (c: Context, next: () => Promise<void>) => {
    const requestId = c.get('requestId');
    const logger = createRequestLogger(requestId, { module: 'AuthorizeMiddleware' });

    const userId = c.get('userId');

    if (!userId) {
      logger.warn('No user ID in context');
      return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401);
    }

    const userHasRole = await hasRole(userId, roles[0] as any);

    if (!userHasRole) {
      const userRole = c.get('userRole') || 'unknown';
      logger.warn('Insufficient role', { userId, userRole, requiredRoles: roles });
      return c.json({ error: 'Forbidden', message: 'Insufficient role' }, 403);
    }

    logger.debug('Role check passed', { userId, roles });

    await next();
  };
}

/**
 * Require specific permission middleware
 */
export function requirePermission(...permissions: string[]) {
  return async (c: Context, next: () => Promise<void>) => {
    const requestId = c.get('requestId');
    const logger = createRequestLogger(requestId, { module: 'AuthorizeMiddleware' });

    const userId = c.get('userId');

    if (!userId) {
      logger.warn('No user ID in context');
      return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401);
    }

    for (const permission of permissions) {
      const hasRequiredPermission = await hasPermission(userId, permission);

      if (!hasRequiredPermission) {
        logger.warn('Insufficient permission', { userId, requiredPermission: permission });
        return c.json({ error: 'Forbidden', message: 'Insufficient permission' }, 403);
      }
    }

    logger.debug('Permission check passed', { userId, permissions });

    await next();
  };
}

/**
 * Require admin role middleware
 */
export const requireAdmin = requireRole('admin');

/**
 * Require editor or admin role middleware
 */
export const requireEditor = requireRole('admin', 'editor');

/**
 * Self or admin middleware
 * User can access their own resources or admin can access any
 */
export function requireSelfOrAdmin() {
  return async (c: Context, next: () => Promise<void>) => {
    const requestId = c.get('requestId');
    const logger = createRequestLogger(requestId, { module: 'AuthorizeMiddleware' });

    const userId = c.get('userId');
    const userRole = c.get('userRole');
    const resourceUserId = c.param('userId') || c.param('id');

    if (!userId) {
      logger.warn('No user ID in context');
      return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401);
    }

    if (userRole === 'admin' || resourceUserId === userId) {
      logger.debug('Self or admin check passed', { userId, resourceUserId, userRole });
      await next();
      return;
    }

    logger.warn('Self or admin check failed', { userId, resourceUserId, userRole });
    return c.json({ error: 'Forbidden', message: 'Access denied' }, 403);
  };
}
