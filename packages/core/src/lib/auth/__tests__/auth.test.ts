/**
 * Authentication and Authorization Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  listUsers,
  validatePassword,
} from '../services/user';
import {
  createSession,
  getSession,
  validateSession,
  refreshSession,
  revokeSession,
  revokeAllSessions,
  cleanupExpiredSessions,
} from '../services/session';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  refreshAccessToken,
  revokeRefreshToken,
} from '../services/token';
import { hasRole, hasPermission, checkPermission, getPermissionsForRole } from '../services/rbac';
import { validatePasswordStrength, isPasswordStrong } from '../utils/password';
import { logAuthEvent } from '../utils/audit';
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
  UserNotFoundError,
  SessionNotFoundError,
  RefreshTokenNotFoundError,
} from '../errors';
import { initializeDb, getDb, closeDb } from '../../../db';
import { createLogger } from '../../../logger';

const logger = createLogger({ module: 'AuthTests' });

describe('User Service', () => {
  let userId: string;

  beforeEach(async () => {
    await initializeDb();
  });

  afterEach(async () => {
    await closeDb();
  });

  it('should create user with valid data', async () => {
    const user = await createUser({
      email: 'test@example.com',
      name: 'Test User',
      password: 'SecurePass123!',
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
    expect(user.role).toBe('user');
    expect(user.id).toBeDefined();
    expect(user.passwordHash).toBeUndefined();
    userId = user.id;
  });

  it('should throw error for duplicate email', async () => {
    await createUser({
      email: 'test@example.com',
      password: 'SecurePass123!',
    });

    await expect(
      createUser({
        email: 'test@example.com',
        password: 'AnotherPass123!',
      })
    ).rejects.toThrow(UserAlreadyExistsError);
  });

  it('should get user by ID', async () => {
    const created = await createUser({
      email: 'test@example.com',
      password: 'SecurePass123!',
    });

    const user = await getUserById(created.id);

    expect(user).toBeDefined();
    expect(user?.id).toBe(created.id);
    expect(user?.email).toBe('test@example.com');
  });

  it('should get user by email', async () => {
    await createUser({
      email: 'test@example.com',
      password: 'SecurePass123!',
    });

    const user = await getUserByEmail('test@example.com');

    expect(user).toBeDefined();
    expect(user?.email).toBe('test@example.com');
    expect(user?.passwordHash).toBeDefined();
  });

  it('should update user fields', async () => {
    const user = await createUser({
      email: 'test@example.com',
      password: 'SecurePass123!',
    });

    const updated = await updateUser(user.id, {
      name: 'Updated Name',
      role: 'editor',
    });

    expect(updated).toBeDefined();
    expect(updated?.name).toBe('Updated Name');
    expect(updated?.role).toBe('editor');
  });

  it('should soft delete user', async () => {
    const user = await createUser({
      email: 'test@example.com',
      password: 'SecurePass123!',
    });

    const result = await deleteUser(user.id);

    expect(result).toBe(true);

    const deletedUser = await getUserById(user.id);
    expect(deletedUser).toBeNull();
  });

  it('should validate correct password', async () => {
    const user = await createUser({
      email: 'test@example.com',
      password: 'SecurePass123!',
    });

    const userWithHash = await getUserByEmail('test@example.com');

    if (userWithHash?.passwordHash) {
      const isValid = await validatePassword('SecurePass123!', userWithHash.passwordHash);
      expect(isValid).toBe(true);
    }
  });

  it('should reject incorrect password', async () => {
    const user = await createUser({
      email: 'test@example.com',
      password: 'SecurePass123!',
    });

    const userWithHash = await getUserByEmail('test@example.com');

    if (userWithHash?.passwordHash) {
      const isValid = await validatePassword('WrongPassword123!', userWithHash.passwordHash);
      expect(isValid).toBe(false);
    }
  });

  it('should list users with pagination', async () => {
    await createUser({ email: 'user1@example.com', password: 'Pass123!' });
    await createUser({ email: 'user2@example.com', password: 'Pass123!' });
    await createUser({ email: 'user3@example.com', password: 'Pass123!' });

    const result = await listUsers({}, { page: 1, limit: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.total).toBeGreaterThanOrEqual(3);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(2);
  });

  it('should filter users by role', async () => {
    await createUser({ email: 'admin@example.com', password: 'Pass123!', role: 'admin' });
    await createUser({ email: 'user@example.com', password: 'Pass123!', role: 'user' });

    const result = await listUsers({ role: 'admin' });

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].role).toBe('admin');
  });

  it('should search users by email or name', async () => {
    await createUser({ email: 'john@example.com', name: 'John Doe', password: 'Pass123!' });
    await createUser({ email: 'jane@example.com', name: 'Jane Smith', password: 'Pass123!' });

    const result = await listUsers({ search: 'john' });

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.some(u => u.email.includes('john') || u.name?.includes('john'))).toBe(true);
  });
});

describe('Session Service', () => {
  let userId: string;

  beforeEach(async () => {
    await initializeDb();
    const user = await createUser({
      email: 'test@example.com',
      password: 'SecurePass123!',
    });
    userId = user.id;
  });

  afterEach(async () => {
    await closeDb();
  });

  it('should create session', async () => {
    const session = await createSession(userId, {
      userAgent: 'TestAgent',
      ipAddress: '127.0.0.1',
    });

    expect(session).toBeDefined();
    expect(session.userId).toBe(userId);
    expect(session.userAgent).toBe('TestAgent');
    expect(session.ipAddress).toBe('127.0.0.1');
  });

  it('should get session by ID', async () => {
    const created = await createSession(userId);

    const session = await getSession(created.id);

    expect(session).toBeDefined();
    expect(session?.id).toBe(created.id);
  });

  it('should validate valid session', async () => {
    const created = await createSession(userId);

    const isValid = await validateSession(created.id);

    expect(isValid).toBeDefined();
    expect(isValid?.id).toBe(created.id);
  });

  it('should reject expired session', async () => {
    const db = getDb();
    const created = await createSession(userId);

    await db.update('sessions')
      .set({ expiresAt: Math.floor(Date.now() / 1000) - 3600 })
      .where({ id: created.id });

    const isValid = await validateSession(created.id);

    expect(isValid).toBeNull();
  });

  it('should refresh session and extend expiry', async () => {
    const created = await createSession(userId);

    const refreshed = await refreshSession(created.id);

    expect(refreshed).toBeDefined();
    expect(refreshed?.expiresAt).toBeGreaterThan(created.expiresAt);
  });

  it('should revoke session', async () => {
    const created = await createSession(userId);

    const result = await revokeSession(created.id);

    expect(result).toBe(true);

    const session = await getSession(created.id);
    expect(session).toBeNull();
  });

  it('should revoke all sessions for user', async () => {
    await createSession(userId);
    await createSession(userId);
    await createSession(userId);

    const count = await revokeAllSessions(userId);

    expect(count).toBe(3);
  });

  it('should throw error when revoking non-existent session', async () => {
    await expect(revokeSession('non-existent-id')).rejects.toThrow(SessionNotFoundError);
  });
});

describe('Token Service', () => {
  let userId: string;

  beforeEach(async () => {
    await initializeDb();
    const user = await createUser({
      email: 'test@example.com',
      password: 'SecurePass123!',
    });
    userId = user.id;
    process.env.JWT_SECRET = 'test-secret-key-must-be-at-least-32-chars';
  });

  afterEach(async () => {
    delete process.env.JWT_SECRET;
    await closeDb();
  });

  it('should generate access token', async () => {
    const token = await generateAccessToken(userId, {
      id: userId,
      email: 'test@example.com',
      role: 'user',
    });

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('should verify valid access token', async () => {
    const token = await generateAccessToken(userId, {
      id: userId,
      email: 'test@example.com',
      role: 'user',
    });

    const payload = await verifyAccessToken(token);

    expect(payload).toBeDefined();
    expect(payload.userId).toBe(userId);
    expect(payload.email).toBe('test@example.com');
    expect(payload.role).toBe('user');
  });

  it('should generate refresh token', async () => {
    const token = await generateRefreshToken(userId);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  it('should verify valid refresh token', async () => {
    const token = await generateRefreshToken(userId);

    const { userId: tokenUserId } = await verifyRefreshToken(token);

    expect(tokenUserId).toBe(userId);
  });

  it('should refresh access token', async () => {
    const refreshToken = await generateRefreshToken(userId);

    const result = await refreshAccessToken(refreshToken);

    expect(result).toBeDefined();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBe(refreshToken);
    expect(result.expiresIn).toBe(15 * 60);
  });

  it('should revoke refresh token', async () => {
    const token = await generateRefreshToken(userId);

    const result = await revokeRefreshToken(token);

    expect(result).toBe(true);

    await expect(verifyRefreshToken(token)).rejects.toThrow(RefreshTokenNotFoundError);
  });
});

describe('RBAC Service', () => {
  let userId: string;
  let adminId: string;

  beforeEach(async () => {
    await initializeDb();
    const user = await createUser({
      email: 'user@example.com',
      password: 'Pass123!',
      role: 'user',
    });
    userId = user.id;

    const admin = await createUser({
      email: 'admin@example.com',
      password: 'Pass123!',
      role: 'admin',
    });
    adminId = admin.id;
  });

  afterEach(async () => {
    await closeDb();
  });

  it('should check user has correct role', async () => {
    const hasUserRole = await hasRole(userId, 'user');
    const hasAdminRole = await hasRole(userId, 'admin');

    expect(hasUserRole).toBe(true);
    expect(hasAdminRole).toBe(false);
  });

  it('should check admin has all roles', async () => {
    const hasUserRole = await hasRole(adminId, 'user');
    const hasEditorRole = await hasRole(adminId, 'editor');
    const hasAdminRole = await hasRole(adminId, 'admin');

    expect(hasUserRole).toBe(true);
    expect(hasEditorRole).toBe(true);
    expect(hasAdminRole).toBe(true);
  });

  it('should check user has permission for role', async () => {
    const canReadContent = await hasPermission(userId, 'content.read');
    const canPublishContent = await hasPermission(userId, 'content.publish');

    expect(canReadContent).toBe(true);
    expect(canPublishContent).toBe(false);
  });

  it('should check admin has all permissions', async () => {
    const canDeleteUsers = await hasPermission(adminId, 'users.delete');
    const canConfigurePlugins = await hasPermission(adminId, 'plugins.configure');

    expect(canDeleteUsers).toBe(true);
    expect(canConfigurePlugins).toBe(true);
  });

  it('should get permissions for role', () => {
    const userPermissions = getPermissionsForRole('user');
    const adminPermissions = getPermissionsForRole('admin');

    expect(userPermissions).toContain('profile.read');
    expect(adminPermissions).toContain('*');
  });

  it('should check permission directly', () => {
    expect(checkPermission('admin', 'users.delete')).toBe(true);
    expect(checkPermission('viewer', 'users.delete')).toBe(false);
    expect(checkPermission('editor', 'content.create')).toBe(true);
    expect(checkPermission('viewer', 'content.read')).toBe(true);
  });
});

describe('Password Validation', () => {
  it('should validate strong password', () => {
    const result = validatePasswordStrength('SecurePass123!');

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject short password', () => {
    const result = validatePasswordStrength('Short1!');

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });

  it('should reject password without uppercase', () => {
    const result = validatePasswordStrength('lowercase123!');

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('should reject password without lowercase', () => {
    const result = validatePasswordStrength('UPPERCASE123!');

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('should reject password without numbers', () => {
    const result = validatePasswordStrength('NoNumbers!');

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  it('should reject password without special chars', () => {
    const result = validatePasswordStrength('NoSpecialChars123');

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('special character'))).toBe(true);
  });

  it('should check if password is strong', () => {
    expect(isPasswordStrong('SecurePass123!')).toBe(true);
    expect(isPasswordStrong('weak')).toBe(false);
  });

  it('should allow custom config', () => {
    const result = validatePasswordStrength('simple', {
      minLength: 4,
      requireUppercase: false,
      requireNumbers: false,
      requireSpecialChars: false,
    });

    expect(result.valid).toBe(true);
  });
});

describe('Audit Logging', () => {
  let userId: string;

  beforeEach(async () => {
    await initializeDb();
    const user = await createUser({
      email: 'test@example.com',
      password: 'SecurePass123!',
    });
    userId = user.id;
  });

  afterEach(async () => {
    await closeDb();
  });

  it('should log auth event successfully', async () => {
    const event = await logAuthEvent({
      userId,
      eventType: 'login',
      ipAddress: '127.0.0.1',
      userAgent: 'TestAgent',
      success: true,
    });

    expect(event).toBeDefined();
    expect(event.userId).toBe(userId);
    expect(event.eventType).toBe('login');
    expect(event.success).toBe(true);
  });

  it('should log failed auth event', async () => {
    const event = await logAuthEvent({
      eventType: 'login',
      ipAddress: '127.0.0.1',
      success: false,
      errorMessage: 'Invalid credentials',
    });

    expect(event).toBeDefined();
    expect(event.success).toBe(false);
    expect(event.errorMessage).toBe('Invalid credentials');
  });

  it('should log different event types', async () => {
    const types = ['register', 'login', 'logout', 'password_change', 'token_generated', 'session_created', 'session_revoked'] as const;

    for (const type of types) {
      const event = await logAuthEvent({
        userId,
        eventType: type,
        success: true,
      });

      expect(event.eventType).toBe(type);
    }
  });
});
