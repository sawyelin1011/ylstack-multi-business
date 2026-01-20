/**
 * Audit Logging for Authentication Events
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db';
import { authEventsTable } from '../../db/schema';
import { createLogger } from '../../logger';
import type { AuthEvent, AuthEventType } from '../types';

const logger = createLogger({ module: 'AuthAudit' });

/**
 * Log an authentication event
 */
export async function logAuthEvent(event: {
  userId?: string;
  eventType: AuthEventType;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  success: boolean;
  errorMessage?: string;
}): Promise<AuthEvent> {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const authEvent: AuthEvent = {
    id: uuidv4(),
    userId: event.userId || null,
    eventType: event.eventType,
    ipAddress: event.ipAddress || null,
    userAgent: event.userAgent || null,
    details: event.details || null,
    success: event.success,
    errorMessage: event.errorMessage || null,
    createdAt: now,
  };

  await db.insert(authEventsTable).values(authEvent);

  if (event.success) {
    logger.info('Auth event logged', {
      eventType: event.eventType,
      userId: event.userId,
    });
  } else {
    logger.warn('Auth event failed', {
      eventType: event.eventType,
      userId: event.userId,
      errorMessage: event.errorMessage,
    });
  }

  return authEvent;
}

/**
 * Get auth events for a user
 */
export async function getAuthEventsForUser(
  userId: string,
  limit: number = 50
): Promise<AuthEvent[]> {
  const db = getDb();

  const events = await db
    .select()
    .from(authEventsTable)
    .where(eq(authEventsTable.userId, userId))
    .orderBy(desc(authEventsTable.createdAt))
    .limit(limit);

  return events;
}

/**
 * Get auth events by type
 */
export async function getAuthEventsByType(
  eventType: AuthEventType,
  limit: number = 100
): Promise<AuthEvent[]> {
  const db = getDb();

  const events = await db
    .select()
    .from(authEventsTable)
    .where(eq(authEventsTable.eventType, eventType))
    .orderBy(desc(authEventsTable.createdAt))
    .limit(limit);

  return events;
}

/**
 * Clean up old auth events (for maintenance)
 */
export async function cleanupOldAuthEvents(olderThanDays: number = 90): Promise<number> {
  const db = getDb();
  const cutoffTime = Math.floor((Date.now() - olderThanDays * 24 * 60 * 60 * 1000) / 1000);

  const result = await db
    .delete(authEventsTable)
    .where(lt(authEventsTable.createdAt, cutoffTime))
    .returning();

  logger.info('Old auth events cleaned up', { count: result.length });

  return result.length;
}

import { eq, desc, lt } from 'drizzle-orm';
