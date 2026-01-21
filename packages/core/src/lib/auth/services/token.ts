/**
 * Token Service - JWT token generation and validation
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db';
import { refreshTokensTable } from '../../db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { createLogger } from '../../logger';
import { getAuthConfig } from '../../config';
import type {
  TokenPair,
  JwtPayload,
  UserPayload,
} from '../types';
import {
  InvalidTokenError,
  TokenExpiredError,
  RefreshTokenNotFoundError,
} from '../errors';

const logger = createLogger({ module: 'TokenService' });

const ACCESS_TOKEN_DURATION = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Get JWT secret from config
 */
function getJwtSecret(): string {
  const config = getAuthConfig();
  const secret = config.jwt?.secret || process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long'
    );
  }

  return secret;
}

/**
 * Generate access token
 */
export async function generateAccessToken(
  userId: string,
  payload: UserPayload,
  expiresIn: number = ACCESS_TOKEN_DURATION
): Promise<string> {
  logger.debug('Generating access token', { userId });

  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);

  const jwtPayload: JwtPayload = {
    userId,
    email: payload.email,
    role: payload.role,
    sessionId: payload.sessionId,
    iat: now,
    exp: now + expiresIn,
  };

  const token = jwt.sign(jwtPayload, secret);

  logger.info('Access token generated', { userId });

  return token;
}

/**
 * Generate refresh token
 */
export async function generateRefreshToken(
  userId: string
): Promise<string> {
  logger.debug('Generating refresh token', { userId });

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + REFRESH_TOKEN_DURATION;

  const tokenId = uuidv4();
  const tokenValue = uuidv4() + uuidv4();

  await db.insert(refreshTokensTable).values({
    id: tokenId,
    token: tokenValue,
    userId,
    expiresAt,
    revoked: false,
    createdAt: now,
  });

  logger.info('Refresh token generated', { userId, tokenId });

  return tokenValue;
}

/**
 * Generate token pair (access + refresh)
 */
export async function generateTokenPair(
  userId: string,
  userPayload: UserPayload,
  sessionId?: string
): Promise<TokenPair> {
  logger.debug('Generating token pair', { userId });

  const payload = {
    ...userPayload,
    sessionId,
  };

  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(userId, payload),
    generateRefreshToken(userId),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_DURATION,
  };
}

/**
 * Verify access token
 */
export async function verifyAccessToken(
  token: string
): Promise<JwtPayload> {
  logger.debug('Verifying access token');

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as JwtPayload;

    logger.info('Access token verified', { userId: decoded.userId });

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Access token expired');
      throw new TokenExpiredError();
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid access token', { error: error.message });
      throw new InvalidTokenError();
    }
    throw error;
  }
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(
  token: string
): Promise<{ userId: string; tokenId: string }> {
  logger.debug('Verifying refresh token');

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const storedToken = await db
    .select()
    .from(refreshTokensTable)
    .where(eq(refreshTokensTable.token, token))
    .get();

  if (!storedToken) {
    logger.warn('Refresh token not found');
    throw new RefreshTokenNotFoundError();
  }

  if (storedToken.revoked) {
    logger.warn('Refresh token revoked', { tokenId: storedToken.id });
    throw new InvalidTokenError('Token has been revoked');
  }

  if (storedToken.expiresAt < now) {
    logger.warn('Refresh token expired', { tokenId: storedToken.id });
    throw new TokenExpiredError();
  }

  logger.info('Refresh token verified', { userId: storedToken.userId, tokenId: storedToken.id });

  return {
    userId: storedToken.userId,
    tokenId: storedToken.id,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshTokenValue: string
): Promise<TokenPair> {
  logger.debug('Refreshing access token');

  const { userId } = await verifyRefreshToken(refreshTokenValue);

  const user = await getDb()
    .select()
    .from(refreshTokensTable)
    .where(eq(refreshTokensTable.token, refreshTokenValue))
    .get();

  if (!user) {
    throw new RefreshTokenNotFoundError();
  }

  const userPayload = {
    id: userId,
    email: userId, // Need to fetch actual email from user table
    role: 'user', // Need to fetch actual role from user table
  };

  const newAccessToken = await generateAccessToken(userId, userPayload);

  logger.info('Access token refreshed', { userId });

  return {
    accessToken: newAccessToken,
    refreshToken: refreshTokenValue,
    expiresIn: ACCESS_TOKEN_DURATION,
  };
}

/**
 * Revoke refresh token
 */
export async function revokeRefreshToken(token: string): Promise<boolean> {
  logger.debug('Revoking refresh token');

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const result = await db
    .update(refreshTokensTable)
    .set({ revoked: true, revokedAt: now })
    .where(eq(refreshTokensTable.token, token))
    .returning();

  if (result.length === 0) {
    throw new RefreshTokenNotFoundError();
  }

  logger.info('Refresh token revoked');

  return true;
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllRefreshTokens(userId: string): Promise<number> {
  logger.debug('Revoking all refresh tokens for user', { userId });

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const result = await db
    .update(refreshTokensTable)
    .set({ revoked: true, revokedAt: now })
    .where(and(eq(refreshTokensTable.userId, userId), eq(refreshTokensTable.revoked, false)))
    .returning();

  logger.info('All refresh tokens revoked for user', { userId, count: result.length });

  return result.length;
}

/**
 * Cleanup expired refresh tokens (for cron job)
 */
export async function cleanupExpiredRefreshTokens(): Promise<number> {
  logger.debug('Cleaning up expired refresh tokens');

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const result = await db
    .delete(refreshTokensTable)
    .where(lt(refreshTokensTable.expiresAt, now))
    .returning();

  logger.info('Expired refresh tokens cleaned up', { count: result.length });

  return result.length;
}

/**
 * Get access token duration in seconds
 */
export function getAccessTokenDuration(): number {
  return ACCESS_TOKEN_DURATION;
}

/**
 * Get refresh token duration in seconds
 */
export function getRefreshTokenDuration(): number {
  return REFRESH_TOKEN_DURATION;
}
