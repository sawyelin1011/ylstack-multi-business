import { ZodError, type ZodType } from 'zod';
import type { Config } from './schema';
import { configSchema } from './schema';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  path: string[];
  message: string;
  code: string;
  expected?: string;
  received?: string;
}

export function validateConfig(config: unknown): ValidationResult<Config> {
  const result = configSchema.safeParse(config);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errors = formatZodError(result.error);
  return {
    success: false,
    errors,
  };
}

export function validateConfigStrict<T>(
  config: unknown,
  schema: ZodType<T>,
  context: string = 'config'
): ValidationResult<T> {
  const result = schema.safeParse(config);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errors = formatZodError(result.error, context);
  return {
    success: false,
    errors,
  };
}

export function formatZodError(error: ZodError, context: string = 'Configuration'): ValidationError[] {
  return (error.issues || []).map((err: any) => ({
    path: err.path || [],
    message: err.message,
    code: err.code,
    expected: formatExpected(err),
    received: formatReceived(err),
  }));
}

function formatExpected(err: any): string | undefined {
  switch (err.code) {
    case 'invalid_type':
      return `Expected ${err.expected}`;
    case 'invalid_enum':
      return `Expected one of: ${err.options.join(', ')}`;
    case 'too_small':
      return err.type === 'string'
        ? `Expected at least ${err.minimum} character${err.minimum === 1 ? '' : 's'}`
        : `Expected at least ${err.minimum}`;
    case 'too_big':
      return err.type === 'string'
        ? `Expected at most ${err.maximum} character${err.maximum === 1 ? '' : 's'}`
        : `Expected at most ${err.maximum}`;
    case 'invalid_union':
      return 'Expected a valid union member';
    default:
      return undefined;
  }
}

function formatReceived(err: any): string | undefined {
  switch (err.code) {
    case 'invalid_type':
      return err.received;
    default:
      return undefined;
  }
}

export function printValidationErrors(errors: ValidationError[], context: string = 'Configuration'): void {
  console.error(`\n❌ Invalid ${context}:\n`);

  for (const error of errors) {
    const path = error.path.length > 0 ? error.path.join('.') : 'root';
    console.error(`  - ${path}: ${error.message}`);

    if (error.expected) {
      console.error(`    Expected: ${error.expected}`);
    }
    if (error.received) {
      console.error(`    Received: ${error.received}`);
    }
  }

  console.error('');
}

export class ConfigValidationError extends Error {
  public errors: ValidationError[];
  public context: string;

  constructor(errors: ValidationError[], context: string = 'Configuration') {
    super(`${context} validation failed with ${errors.length} error(s)`);
    this.name = 'ConfigValidationError';
    this.errors = errors;
    this.context = context;
  }

  toString(): string {
    let message = `❌ ${this.context} validation failed:\n\n`;
    for (const error of this.errors) {
      const path = error.path.length > 0 ? error.path.join('.') : 'root';
      message += `  - ${path}: ${error.message}\n`;
    }
    return message;
  }
}

export function assertValidConfig(config: unknown, context: string = 'Configuration'): Config {
  const result = validateConfig(config);

  if (!result.success) {
    if (result.errors) {
      printValidationErrors(result.errors, context);
      throw new ConfigValidationError(result.errors, context);
    }
    throw new Error('Configuration validation failed');
  }

  return result.data as Config;
}

export function checkRequiredSecrets(config: Config): string[] {
  const missingSecrets: string[] = [];

  if (!config.auth.jwtSecret || config.auth.jwtSecret.length < 32) {
    missingSecrets.push(
      'JWT_SECRET environment variable must be at least 32 characters long. ' +
        'Generate one with: `openssl rand -base64 32`'
    );
  }

  if (config.storage.provider !== 'local') {
    if (config.storage.provider === 's3' && !config.storage.bucket) {
      missingSecrets.push(
        'STORAGE_BUCKET environment variable is required when using S3 storage'
      );
    }
    if (config.storage.provider === 'r2' && !config.storage.bucket) {
      missingSecrets.push(
        'STORAGE_BUCKET environment variable is required when using R2 storage'
      );
    }
  }

  return missingSecrets;
}

export function validateSecrets(config: Config): void {
  const missingSecrets = checkRequiredSecrets(config);

  if (missingSecrets.length > 0) {
    console.error('\n❌ Missing or invalid secrets:\n');
    for (const secret of missingSecrets) {
      console.error(`  - ${secret}`);
    }
    console.error('');
    throw new Error('Required secrets are missing or invalid');
  }
}
