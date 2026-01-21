/**
 * Authentication Middleware
 */

import { Context } from 'hono';
import { verifyAccessToken } from '../services/token';
import { getUserById } from '../services/user';
import { InvalidTokenError, TokenExpiredError } from '../errors';
import { createRequestLogger } from '../../logger';
import type { UserPayload } from '../types';

/**
 * Attach user to context from JWT token
 */
export async function attachUserFromToken(
  c: Context,
  token: string
): Promise<UserPayload | null> {
  try {
    const payload = await verifyAccessToken(token);
    const user = await getUserById(payload.userId);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    if (error instanceof InvalidTokenError || error instanceof TokenExpiredError) {
      return null;
    }
    throw error;
  }
}

/**
 * Require authentication middleware
 * Validates JWT token and attaches user to context
 */
export function requireAuth() {
  return async (c: Context, next: () => Promise<void>) => {
    const requestId = c.get('requestId');
    const logger = createRequestLogger(requestId, { module: 'AuthMiddleware' });

    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      logger.warn('Missing authorization header');
      return c.json({ error: 'Unauthorized', message: 'Authorization header required' }, 401);
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/);

    if (!match) {
      logger.warn('Invalid authorization header format');
      return c.json({ error: 'Unauthorized', message: 'Invalid authorization header format' }, 401);
    }

    const token = match[1];

    try {
      const user = await attachUserFromToken(c, token);

      if (!user) {
        logger.warn('Invalid or expired token');
        return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401);
      }

      c.set('user', user);
      c.set('userId', user.id);
      c.set('userRole', user.role);

      logger.debug('User authenticated', { userId: user.id, role: user.role });

      await next();
    } catch (error) {
      if (error instanceof InvalidTokenError || error instanceof TokenExpiredError) {
        logger.warn('Token validation failed', { error: error.message });
        return c.json({ error: 'Unauthorized', message: error.message }, 401);
      }
      throw error;
    }
  };
}

/**
 * Optional authentication middleware
 * Validates JWT token if present, but doesn't require it
 */
export function optionalAuth() {
  return async (c: Context, next: () => Promise<void>) => {
    const requestId = c.get('requestId');
    const logger = createRequestLogger(requestId, { module: 'AuthMiddleware' });

    const authHeader = c.req.header('Authorization');

    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/);

      if (match) {
        const token = match[1];

        try {
          const user = await attachUserFromToken(c, token);

          if (user) {
            c.set('user', user);
            c.set('userId', user.id);
            c.set('userRole', user.role);
            logger.debug('User authenticated (optional)', { userId: user.id, role: user.role });
          }
        } catch (error) {
          logger.debug('Optional auth failed, continuing without user', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }

    await next();
  };
}

/**
 * Get authenticated user from context
 */
export function getAuthUser(c: Context): UserPayload | null {
  return c.get('user') || null;
}

/**
 * Get user ID from context
 */
export function getUserId(c: Context): string | null {
  return c.get('userId') || null;
}

/**
 * Get user role from context
 */
export function getUserRole(c: Context): string | null {
  return c.get('userRole') || null;
}
