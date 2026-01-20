/**
 * Authentication and Authorization Types
 */

export interface User {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  createdAt: number;
  updatedAt: number;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: number;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface RefreshToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: number;
  revoked: boolean;
  revokedAt?: number | null;
  createdAt: number;
}

export interface AuthEvent {
  id: string;
  userId?: string | null;
  eventType: AuthEventType;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: string | null;
  success: boolean;
  errorMessage?: string | null;
  createdAt: number;
}

export type AuthEventType =
  | 'register'
  | 'login'
  | 'logout'
  | 'password_change'
  | 'token_generated'
  | 'session_created'
  | 'session_revoked'
  | 'all_sessions_revoked'
  | 'token_refresh'
  | 'token_revoked';

export interface UserPayload {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

export interface SessionPayload {
  userId: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  sessionId?: string;
  iat: number;
  exp: number;
}

export interface CreateUserInput {
  email: string;
  name?: string;
  password: string;
  role?: string;
}

export interface UpdateUserInput {
  name?: string;
  password?: string;
  role?: string;
}

export interface UserFilter {
  role?: string;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface PasswordValidationConfig {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export type UserRole = 'admin' | 'editor' | 'viewer' | 'user';

export const DEFAULT_ROLES: UserRole[] = ['admin', 'editor', 'viewer', 'user'];

export interface RolePermissions {
  [role: string]: string[];
}

export interface PluginContext {
  db: any;
  config: any;
  logger: any;
}

export interface HookContext {
  pluginName: string;
  timestamp: number;
  [key: string]: any;
}

export type HookHandler<T = any, R = any> = (
  data: T,
  context: HookContext
) => R | Promise<R>;
