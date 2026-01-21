/**
 * Session Service - User session management
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db';
import { sessionsTable } from '../../db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { createLogger } from '../../logger';
import type {
  Session,
  SessionPayload,
} from '../types';
import { SessionNotFoundError } from '../errors';

const logger = createLogger({ module: 'SessionService' });

const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

/**
 * Create a new session
 */
export async function createSession(
  userId: string,
  metadata: { userAgent?: string; ipAddress?: string } = {}
): Promise<Session> {
  logger.debug('Creating session', { userId, metadata });

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_DURATION;

  const sessionId = uuidv4();

  const newSession = {
    id: sessionId,
    userId,
    expiresAt,
    userAgent: metadata.userAgent || null,
    ipAddress: metadata.ipAddress || null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(sessionsTable).values(newSession);

  logger.info('Session created', { sessionId, userId });

  return newSession;
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  logger.debug('Getting session', { sessionId });

  const db = getDb();
  const session = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .get();

  return session || null;
}

/**
 * Validate session - check if exists and not expired
 */
export async function validateSession(
  sessionId: string
): Promise<Session | null> {
  const session = await getSession(sessionId);

  if (!session) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  if (session.expiresAt < now) {
    await cleanupExpiredSession(sessionId);
    return null;
  }

  return session;
}

/**
 * Refresh session - extend expiry time
 */
export async function refreshSession(sessionId: string): Promise<Session | null> {
  logger.debug('Refreshing session', { sessionId });

  const session = await validateSession(sessionId);

  if (!session) {
    return null;
  }

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_DURATION;

  await db
    .update(sessionsTable)
    .set({ expiresAt, updatedAt: now })
    .where(eq(sessionsTable.id, sessionId));

  const refreshedSession = await getSession(sessionId);

  logger.info('Session refreshed', { sessionId });

  return refreshedSession;
}

/**
 * Revoke a session
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  logger.debug('Revoking session', { sessionId });

  const db = getDb();

  const result = await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .returning();

  if (result.length === 0) {
    throw new SessionNotFoundError(sessionId);
  }

  logger.info('Session revoked', { sessionId });

  return true;
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllSessions(userId: string): Promise<number> {
  logger.debug('Revoking all sessions for user', { userId });

  const db = getDb();

  const result = await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.userId, userId))
    .returning();

  logger.info('All sessions revoked for user', { userId, count: result.length });

  return result.length;
}

/**
 * Cleanup expired session
 */
export async function cleanupExpiredSession(sessionId: string): Promise<boolean> {
  const db = getDb();

  await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));

  return true;
}

/**
 * Cleanup all expired sessions (for cron job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  logger.debug('Cleaning up expired sessions');

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const result = await db
    .delete(sessionsTable)
    .where(lt(sessionsTable.expiresAt, now))
    .returning();

  logger.info('Expired sessions cleaned up', { count: result.length });

  return result.length;
}

/**
 * Get session duration in seconds
 */
export function getSessionDuration(): number {
  return SESSION_DURATION;
}
