/**
 * Role-Based Access Control (RBAC) Service
 */

import { createLogger } from '../../logger';
import type { UserRole } from '../types';
import {
  InsufficientRoleError,
  InsufficientPermissionError,
} from '../errors';

const logger = createLogger({ module: 'RBACService' });

/**
 * Default role permissions
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    '*',
    'users:*',
    'users.create',
    'users.read',
    'users.update',
    'users.delete',
    'plugins:*',
    'plugins.install',
    'plugins.uninstall',
    'plugins.configure',
    'settings:*',
    'content:*',
    'content.publish',
  ],
  editor: [
    'content:*',
    'content.create',
    'content.read',
    'content.update',
    'content.delete',
    'content.publish',
    'media:*',
    'media.upload',
  ],
  viewer: [
    'content.read',
    'media.read',
  ],
  user: [
    'profile:*',
    'profile.read',
    'profile.update',
  ],
};

/**
 * Permission registry (extensible)
 */
const permissionRegistry: Record<string, UserRole[]> = {};

/**
 * Initialize default permissions
 */
function initializeDefaultPermissions(): void {
  Object.entries(DEFAULT_ROLE_PERMISSIONS).forEach(([role, permissions]) => {
    permissions.forEach((permission) => {
      const roles = permissionRegistry[permission] || [];
      if (!roles.includes(role as UserRole)) {
        roles.push(role as UserRole);
      }
      permissionRegistry[permission] = roles;
    });
  });
}

initializeDefaultPermissions();

/**
 * Check if a user has a specific role
 */
export async function hasRole(
  userId: string,
  requiredRole: UserRole
): Promise<boolean> {
  logger.debug('Checking user role', { userId, requiredRole });

  const { getUserById } = await import('./user');
  const user = await getUserById(userId);

  if (!user) {
    return false;
  }

  if (requiredRole === 'admin') {
    return user.role === 'admin';
  }

  const roleHierarchy: UserRole[] = ['admin', 'editor', 'viewer', 'user'];
  const requiredIndex = roleHierarchy.indexOf(requiredRole);
  const userIndex = roleHierarchy.indexOf(user.role as UserRole);

  return userIndex <= requiredIndex;
}

/**
 * Check if a user has a specific permission
 */
export async function hasPermission(
  userId: string,
  requiredPermission: string
): Promise<boolean> {
  logger.debug('Checking user permission', { userId, requiredPermission });

  const { getUserById } = await import('./user');
  const user = await getUserById(userId);

  if (!user) {
    return false;
  }

  return checkPermission(user.role as UserRole, requiredPermission);
}

/**
 * Check if a role has a specific permission
 */
export function checkPermission(role: UserRole, permission: string): boolean {
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];

  if (rolePermissions.includes('*')) {
    return true;
  }

  const [resource, action] = permission.split(':');

  if (rolePermissions.includes(`${resource}:*`)) {
    return true;
  }

  return rolePermissions.includes(permission);
}

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: UserRole): string[] {
  return DEFAULT_ROLE_PERMISSIONS[role] || [];
}

/**
 * Define a new permission for specific roles
 */
export function definePermission(
  name: string,
  roles: UserRole[]
): void {
  logger.info('Defining new permission', { name, roles });

  permissionRegistry[name] = roles;

  roles.forEach((role) => {
    if (!DEFAULT_ROLE_PERMISSIONS[role]) {
      DEFAULT_ROLE_PERMISSIONS[role] = [];
    }
    if (!DEFAULT_ROLE_PERMISSIONS[role].includes(name)) {
      DEFAULT_ROLE_PERMISSIONS[role].push(name);
    }
  });
}

/**
 * Get all permissions
 */
export function getAllPermissions(): Record<string, UserRole[]> {
  return { ...permissionRegistry };
}

/**
 * Get all roles
 */
export function getAllRoles(): UserRole[] {
  return Object.keys(DEFAULT_ROLE_PERMISSIONS) as UserRole[];
}

/**
 * Check role and throw if insufficient
 */
export async function requireRole(
  userId: string,
  requiredRole: UserRole
): Promise<void> {
  const hasRequiredRole = await hasRole(userId, requiredRole);

  if (!hasRequiredRole) {
    const { getUserById } = await import('./user');
    const user = await getUserById(userId);
    throw new InsufficientRoleError(requiredRole, user?.role || 'unknown');
  }
}

/**
 * Check permission and throw if insufficient
 */
export async function requirePermission(
  userId: string,
  permission: string
): Promise<void> {
  const hasRequiredPermission = await hasPermission(userId, permission);

  if (!hasRequiredPermission) {
    throw new InsufficientPermissionError(permission);
  }
}
