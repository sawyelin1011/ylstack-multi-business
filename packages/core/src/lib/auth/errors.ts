/**
 * Authentication and Authorization Error Classes
 */

import { AppError, HTTP_STATUS } from '../api/errors';

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password') {
    super(message, 'INVALID_CREDENTIALS', HTTP_STATUS.UNAUTHORIZED);
  }
}

export class UserAlreadyExistsError extends AppError {
  constructor(email: string) {
    super(
      `User with email ${email} already exists`,
      'USER_ALREADY_EXISTS',
      HTTP_STATUS.CONFLICT
    );
  }
}

export class SessionExpiredError extends AppError {
  constructor(message = 'Session has expired') {
    super(message, 'SESSION_EXPIRED', HTTP_STATUS.UNAUTHORIZED);
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = 'Invalid token') {
    super(message, 'INVALID_TOKEN', HTTP_STATUS.UNAUTHORIZED);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired') {
    super(message, 'TOKEN_EXPIRED', HTTP_STATUS.UNAUTHORIZED);
  }
}

export class PasswordTooWeakError extends AppError {
  constructor(errors: string[]) {
    super(
      `Password does not meet requirements: ${errors.join(', ')}`,
      'PASSWORD_TOO_WEAK',
      HTTP_STATUS.BAD_REQUEST
    );
  }
}

export class UserNotFoundError extends AppError {
  constructor(identifier: string) {
    super(
      `User not found: ${identifier}`,
      'USER_NOT_FOUND',
      HTTP_STATUS.NOT_FOUND
    );
  }
}

export class SessionNotFoundError extends AppError {
  constructor(sessionId: string) {
    super(
      `Session not found: ${sessionId}`,
      'SESSION_NOT_FOUND',
      HTTP_STATUS.NOT_FOUND
    );
  }
}

export class RefreshTokenNotFoundError extends AppError {
  constructor() {
    super(
      'Refresh token not found or has been revoked',
      'REFRESH_TOKEN_NOT_FOUND',
      HTTP_STATUS.UNAUTHORIZED
    );
  }
}

export class InsufficientRoleError extends AppError {
  constructor(requiredRole: string, userRole: string) {
    super(
      `Insufficient role. Required: ${requiredRole}, User has: ${userRole}`,
      'INSUFFICIENT_ROLE',
      HTTP_STATUS.FORBIDDEN
    );
  }
}

export class InsufficientPermissionError extends AppError {
  constructor(permission: string) {
    super(
      `Insufficient permission. Required: ${permission}`,
      'INSUFFICIENT_PERMISSION',
      HTTP_STATUS.FORBIDDEN
    );
  }
}

export class PluginValidationError extends AppError {
  constructor(message: string) {
    super(
      `Plugin validation failed: ${message}`,
      'PLUGIN_VALIDATION_ERROR',
      HTTP_STATUS.BAD_REQUEST
    );
  }
}

export class PluginNotFoundError extends AppError {
  constructor(pluginName: string) {
    super(
      `Plugin not found: ${pluginName}`,
      'PLUGIN_NOT_FOUND',
      HTTP_STATUS.NOT_FOUND
    );
  }
}

export class PluginAlreadyInstalledError extends AppError {
  constructor(pluginName: string) {
    super(
      `Plugin already installed: ${pluginName}`,
      'PLUGIN_ALREADY_INSTALLED',
      HTTP_STATUS.CONFLICT
    );
  }
}

export class PluginDependencyError extends AppError {
  constructor(message: string) {
    super(
      `Plugin dependency error: ${message}`,
      'PLUGIN_DEPENDENCY_ERROR',
      HTTP_STATUS.BAD_REQUEST
    );
  }
}

export class HookExecutionError extends AppError {
  constructor(hookName: string, originalError: Error) {
    super(
      `Hook execution error for ${hookName}: ${originalError.message}`,
      'HOOK_EXECUTION_ERROR',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    this.cause = originalError;
  }
}
