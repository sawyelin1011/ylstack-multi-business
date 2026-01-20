/**
 * Password Validation Utility
 */

import { createLogger } from '../../logger';
import type {
  PasswordValidationConfig,
  PasswordValidationResult,
} from '../types';
import { PasswordTooWeakError } from '../errors';

const logger = createLogger({ module: 'PasswordValidation' });

const DEFAULT_CONFIG: PasswordValidationConfig = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/**
 * Validate password strength against configuration
 */
export function validatePasswordStrength(
  password: string,
  config: PasswordValidationConfig = {}
): PasswordValidationResult {
  const effectiveConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];

  logger.debug('Validating password strength');

  if (!password) {
    return { valid: false, errors: ['Password is required'] };
  }

  if (effectiveConfig.minLength && password.length < effectiveConfig.minLength) {
    errors.push(`Password must be at least ${effectiveConfig.minLength} characters`);
  }

  if (effectiveConfig.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (effectiveConfig.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (effectiveConfig.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (effectiveConfig.requireSpecialChars && !new RegExp(`[${SPECIAL_CHARS}]`).test(password)) {
    errors.push(`Password must contain at least one special character (${SPECIAL_CHARS})`);
  }

  const isValid = errors.length === 0;

  if (!isValid) {
    logger.warn('Password validation failed', { errors });
  } else {
    logger.debug('Password validation passed');
  }

  return {
    valid: isValid,
    errors,
  };
}

/**
 * Validate password and throw error if invalid
 */
export function validatePasswordOrThrow(
  password: string,
  config?: PasswordValidationConfig
): void {
  const result = validatePasswordStrength(password, config);

  if (!result.valid) {
    throw new PasswordTooWeakError(result.errors);
  }
}

/**
 * Check if password meets minimum requirements (no throw)
 */
export function isPasswordStrong(
  password: string,
  config?: PasswordValidationConfig
): boolean {
  return validatePasswordStrength(password, config).valid;
}
