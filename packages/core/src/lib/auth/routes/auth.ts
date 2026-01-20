/**
 * Authentication Routes
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Context } from 'hono';
import { createRequestLogger } from '../../logger';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  conflictResponse,
  badRequestResponse,
} from '../../api/responses';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
} from '../schema';
import {
  createUser,
  getUserByEmail,
  validatePassword,
} from '../services/user';
import {
  generateTokenPair,
  verifyRefreshToken,
  revokeRefreshToken,
} from '../services/token';
import {
  createSession,
  getSession,
  revokeSession,
  revokeAllSessions,
} from '../services/session';
import { logAuthEvent } from '../utils/audit';
import { validatePasswordOrThrow } from '../utils/password';
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
} from '../errors';

const authRouter = new Hono();

/**
 * POST /auth/register
 * Register a new user
 */
authRouter.post('/register', zValidator('json', RegisterSchema), async (c: Context) => {
  const requestId = c.get('requestId');
  const logger = createRequestLogger(requestId, { module: 'AuthRoutes' });

  try {
    const body = c.req.valid('json');

    logger.info('Registration attempt', { email: body.email });

    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    await validatePasswordOrThrow(body.password);

    const user = await createUser({
      email: body.email,
      name: body.name,
      password: body.password,
      role: 'user',
    });

    await logAuthEvent({
      userId: user.id,
      eventType: 'register',
      ipAddress,
      userAgent,
      success: true,
    });

    return successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof UserAlreadyExistsError) {
      await logAuthEvent({
        eventType: 'register',
        ipAddress: c.req.header('x-forwarded-for') || 'unknown',
        userAgent: c.req.header('user-agent') || 'unknown',
        success: false,
        errorMessage: error.message,
      });

      return conflictResponse(error.message);
    }

    if (error instanceof Error) {
      logger.error('Registration error', { error: error.message });
      return badRequestResponse(error.message);
    }

    throw error;
  }
});

/**
 * POST /auth/login
 * Login with email and password
 */
authRouter.post('/login', zValidator('json', LoginSchema), async (c: Context) => {
  const requestId = c.get('requestId');
  const logger = createRequestLogger(requestId, { module: 'AuthRoutes' });

  try {
    const body = c.req.valid('json');

    logger.info('Login attempt', { email: body.email });

    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    const user = await getUserByEmail(body.email);

    if (!user || !user.passwordHash) {
      await logAuthEvent({
        eventType: 'login',
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Invalid credentials',
      });

      throw new InvalidCredentialsError();
    }

    const isValid = await validatePassword(body.password, user.passwordHash);

    if (!isValid) {
      await logAuthEvent({
        userId: user.id,
        eventType: 'login',
        ipAddress,
        userAgent,
        success: false,
        errorMessage: 'Invalid credentials',
      });

      throw new InvalidCredentialsError();
    }

    const session = await createSession(user.id, { userAgent, ipAddress });

    const tokenPair = await generateTokenPair(user.id, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }, session.id);

    await logAuthEvent({
      userId: user.id,
      eventType: 'login',
      ipAddress,
      userAgent,
      success: true,
      details: `Session: ${session.id}`,
    });

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokenPair,
    });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return unauthorizedResponse(error.message);
    }

    if (error instanceof Error) {
      logger.error('Login error', { error: error.message });
      return badRequestResponse(error.message);
    }

    throw error;
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
authRouter.post('/refresh', zValidator('json', RefreshTokenSchema), async (c: Context) => {
  const requestId = c.get('requestId');
  const logger = createRequestLogger(requestId, { module: 'AuthRoutes' });

  try {
    const body = c.req.valid('json');

    logger.info('Token refresh attempt');

    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    const { userId } = await verifyRefreshToken(body.refreshToken);

    const { getUserById } = await import('../services/user');
    const user = await getUserById(userId);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const accessTokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const { generateAccessToken } = await import('../services/token');
    const accessToken = await generateAccessToken(user.id, accessTokenPayload);

    await logAuthEvent({
      userId: user.id,
      eventType: 'token_refresh',
      ipAddress,
      userAgent,
      success: true,
    });

    return successResponse({
      accessToken,
      refreshToken: body.refreshToken,
      expiresIn: 15 * 60,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Token refresh error', { error: error.message });
      return unauthorizedResponse(error.message);
    }

    throw error;
  }
});

/**
 * POST /auth/logout
 * Logout current session
 */
authRouter.post('/logout', async (c: Context) => {
  const requestId = c.get('requestId');
  const logger = createRequestLogger(requestId, { module: 'AuthRoutes' });

  try {
    const userId = c.get('userId');

    if (!userId) {
      return unauthorizedResponse('Authentication required');
    }

    const sessionId = c.get('sessionId');

    if (sessionId) {
      await revokeSession(sessionId);
    }

    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      await revokeRefreshToken(token);
    }

    await logAuthEvent({
      userId,
      eventType: 'logout',
      ipAddress: c.req.header('x-forwarded-for') || 'unknown',
      userAgent: c.req.header('user-agent') || 'unknown',
      success: true,
    });

    return successResponse({ message: 'Logged out successfully' });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Logout error', { error: error.message });
      return badRequestResponse(error.message);
    }

    throw error;
  }
});

/**
 * POST /auth/logout-all
 * Logout all sessions for the user
 */
authRouter.post('/logout-all', async (c: Context) => {
  const requestId = c.get('requestId');
  const logger = createRequestLogger(requestId, { module: 'AuthRoutes' });

  try {
    const userId = c.get('userId');

    if (!userId) {
      return unauthorizedResponse('Authentication required');
    }

    const [sessionsRevoked, tokensRevoked] = await Promise.all([
      revokeAllSessions(userId),
      (async () => {
        const { revokeAllRefreshTokens } = await import('../services/token');
        return revokeAllRefreshTokens(userId);
      })(),
    ]);

    await logAuthEvent({
      userId,
      eventType: 'all_sessions_revoked',
      ipAddress: c.req.header('x-forwarded-for') || 'unknown',
      userAgent: c.req.header('user-agent') || 'unknown',
      success: true,
      details: `${sessionsRevoked} sessions, ${tokensRevoked} tokens revoked`,
    });

    return successResponse({
      message: 'Logged out from all devices',
      sessionsRevoked,
      tokensRevoked,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Logout all error', { error: error.message });
      return badRequestResponse(error.message);
    }

    throw error;
  }
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
authRouter.get('/me', async (c: Context) => {
  const requestId = c.get('requestId');
  const logger = createRequestLogger(requestId, { module: 'AuthRoutes' });

  try {
    const user = c.get('user');

    if (!user) {
      return unauthorizedResponse('Authentication required');
    }

    logger.debug('Get current user', { userId: user.id });

    return successResponse(user);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Get user error', { error: error.message });
      return badRequestResponse(error.message);
    }

    throw error;
  }
});

export { authRouter };
