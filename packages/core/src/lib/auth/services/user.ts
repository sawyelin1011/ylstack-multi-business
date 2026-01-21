/**
 * User Service - User management operations
 */

import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db';
import { usersTable } from '../../db/schema';
import { eq, like, and, desc, or } from 'drizzle-orm';
import { createLogger } from '../../logger';
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  UserFilter,
  PaginationOptions,
  PaginatedResult,
} from '../types';
import {
  UserNotFoundError,
  UserAlreadyExistsError,
} from '../errors';

const logger = createLogger({ module: 'UserService' });

const SALT_ROUNDS = 10;

/**
 * Create a new user with password hashing
 */
export async function createUser(
  input: CreateUserInput
): Promise<Omit<User, 'passwordHash'>> {
  logger.debug('Creating user', { email: input.email });

  const db = getDb();

  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, input.email))
    .get();

  if (existingUser) {
    throw new UserAlreadyExistsError(input.email);
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const now = Math.floor(Date.now() / 1000);

  const userId = uuidv4();

  const newUser = {
    id: userId,
    email: input.email,
    name: input.name || null,
    passwordHash,
    role: input.role || 'user',
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(usersTable).values(newUser);

  logger.info('User created successfully', { userId, email: input.email });

  const { passwordHash: _, ...user } = newUser;
  return user;
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  logger.debug('Getting user by ID', { userId: id });

  const db = getDb();
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .get();

  return user || null;
}

/**
 * Get user by email (includes password hash for auth)
 */
export async function getUserByEmail(
  email: string
): Promise<(User & { passwordHash?: string }) | null> {
  logger.debug('Getting user by email', { email });

  const db = getDb();
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .get();

  return user || null;
}

/**
 * Update user fields
 */
export async function updateUser(
  id: string,
  data: UpdateUserInput
): Promise<User | null> {
  logger.debug('Updating user', { userId: id, fields: Object.keys(data) });

  const db = getDb();
  const existingUser = await getUserById(id);

  if (!existingUser) {
    throw new UserNotFoundError(id);
  }

  const updateData: any = {
    updatedAt: Math.floor(Date.now() / 1000),
  };

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.role !== undefined) {
    updateData.role = data.role;
  }

  if (data.password !== undefined) {
    updateData.passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  }

  await db.update(usersTable).set(updateData).where(eq(usersTable.id, id));

  const updatedUser = await getUserById(id);
  logger.info('User updated successfully', { userId: id });

  return updatedUser;
}

/**
 * Delete (soft delete) user
 */
export async function deleteUser(id: string): Promise<boolean> {
  logger.debug('Deleting user', { userId: id });

  const db = getDb();
  const existingUser = await getUserById(id);

  if (!existingUser) {
    throw new UserNotFoundError(id);
  }

  await db.delete(usersTable).where(eq(usersTable.id, id));

  logger.info('User deleted successfully', { userId: id });

  return true;
}

/**
 * List users with filtering and pagination
 */
export async function listUsers(
  filter: UserFilter = {},
  pagination: PaginationOptions = {}
): Promise<PaginatedResult<User>> {
  logger.debug('Listing users', { filter, pagination });

  const db = getDb();
  const page = pagination.page || 1;
  const limit = pagination.limit || 20;
  const offset = pagination.offset || (page - 1) * limit;

  const conditions = [];

  if (filter.role) {
    conditions.push(eq(usersTable.role, filter.role));
  }

  if (filter.search) {
    const searchTerm = `%${filter.search}%`;
    conditions.push(
      or(
        like(usersTable.email, searchTerm),
        like(usersTable.name || '', searchTerm)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const users = await db
    .select()
    .from(usersTable)
    .where(whereClause)
    .orderBy(desc(usersTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: usersTable.id })
    .from(usersTable)
    .where(whereClause);

  const total = count ? count.length : 0;

  return {
    data: users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Validate plaintext password against hash
 */
export async function validatePassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
