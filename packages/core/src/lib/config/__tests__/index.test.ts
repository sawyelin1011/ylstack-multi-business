import { describe, it, expect, beforeEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { configSchema, type Config } from '../schema';
import {
  loadConfigFile,
  deepMerge,
  interpolateEnvVars,
  applyEnvOverrides,
  DEFAULT_ENV_VAR_MAP,
} from '../loader';
import { validateConfig, validateSecrets, checkRequiredSecrets } from '../validator';
import { configDefaults } from '../defaults';
import { getConfig, reloadConfig } from '../index';

describe('Config Schema', () => {
  it('should validate a valid config', () => {
    const config = {
      platform: {
        name: 'Test Platform',
        version: '1.0.0',
      },
      runtime: {
        adapter: 'node' as const,
        target: 'vps' as const,
      },
      database: {
        driver: 'sqlite' as const,
        url: 'file:./test.db',
        poolSize: 10,
        connectionTimeout: 30000,
      },
      features: {
        plugins: {
          enabled: ['plugin-pages'],
          disabled: [],
        },
        pages: {
          enabled: true,
          maxPages: 100,
        },
        forms: {
          enabled: true,
          maxForms: 50,
        },
        users: {
          enabled: true,
          maxUsers: 1000,
        },
      },
      admin: {
        theme: 'default',
        branding: {
          primaryColor: '#3B82F6',
          name: 'Test Admin',
        },
        defaultRole: 'admin' as const,
      },
      auth: {
        provider: 'better-auth',
        jwtSecret: 'a'.repeat(32),
        sessionDuration: 86400,
        refreshTokenDuration: 604800,
        maxSessionAge: 2592000,
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        passwordRequireSpecialChars: false,
      },
      storage: {
        provider: 'local' as const,
        path: './uploads',
        maxFileSize: 10485760,
        allowedMimeTypes: ['image/jpeg'],
      },
      logging: {
        level: 'info' as const,
        format: 'pretty' as const,
        maxFiles: 10,
        maxSize: '10m',
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
        cors: {
          enabled: true,
          origin: '*',
          credentials: true,
        },
        rateLimit: {
          enabled: true,
          windowMs: 60000,
          maxRequests: 100,
        },
      },
    };

    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should reject invalid enum values', () => {
    const config = {
      platform: { name: 'Test', version: '1.0.0' },
      runtime: {
        adapter: 'invalid' as any,
        target: 'vps' as const,
      },
      database: { driver: 'sqlite' as const, url: 'file:./test.db', poolSize: 10, connectionTimeout: 30000 },
      features: { plugins: { enabled: [], disabled: [] }, pages: { enabled: true, maxPages: 100 }, forms: { enabled: true, maxForms: 50 }, users: { enabled: true, maxUsers: 1000 } },
      admin: { theme: 'default', branding: { primaryColor: '#3B82F6', name: 'Test' }, defaultRole: 'admin' as const },
      auth: { provider: 'better-auth', jwtSecret: 'a'.repeat(32), sessionDuration: 86400, refreshTokenDuration: 604800, maxSessionAge: 2592000, passwordMinLength: 8, passwordRequireUppercase: true, passwordRequireLowercase: true, passwordRequireNumbers: true, passwordRequireSpecialChars: false },
      storage: { provider: 'local' as const, path: './uploads', maxFileSize: 10485760, allowedMimeTypes: [] },
      logging: { level: 'info' as const, format: 'pretty' as const, maxFiles: 10, maxSize: '10m' },
      server: { port: 3000, host: '0.0.0.0', cors: { enabled: true, origin: '*', credentials: true }, rateLimit: { enabled: true, windowMs: 60000, maxRequests: 100 } },
    };

    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject JWT secret less than 32 characters', () => {
    const config = {
      platform: { name: 'Test', version: '1.0.0' },
      runtime: { adapter: 'node' as const, target: 'vps' as const },
      database: { driver: 'sqlite' as const, url: 'file:./test.db', poolSize: 10, connectionTimeout: 30000 },
      features: { plugins: { enabled: [], disabled: [] }, pages: { enabled: true, maxPages: 100 }, forms: { enabled: true, maxForms: 50 }, users: { enabled: true, maxUsers: 1000 } },
      admin: { theme: 'default', branding: { primaryColor: '#3B82F6', name: 'Test' }, defaultRole: 'admin' as const },
      auth: { provider: 'better-auth', jwtSecret: 'short', sessionDuration: 86400, refreshTokenDuration: 604800, maxSessionAge: 2592000, passwordMinLength: 8, passwordRequireUppercase: true, passwordRequireLowercase: true, passwordRequireNumbers: true, passwordRequireSpecialChars: false },
      storage: { provider: 'local' as const, path: './uploads', maxFileSize: 10485760, allowedMimeTypes: [] },
      logging: { level: 'info' as const, format: 'pretty' as const, maxFiles: 10, maxSize: '10m' },
      server: { port: 3000, host: '0.0.0.0', cors: { enabled: true, origin: '*', credentials: true }, rateLimit: { enabled: true, windowMs: 60000, maxRequests: 100 } },
    };

    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject extra keys', () => {
    const config = {
      platform: { name: 'Test', version: '1.0.0' },
      runtime: { adapter: 'node' as const, target: 'vps' as const },
      database: { driver: 'sqlite' as const, url: 'file:./test.db', poolSize: 10, connectionTimeout: 30000 },
      features: { plugins: { enabled: [], disabled: [] }, pages: { enabled: true, maxPages: 100 }, forms: { enabled: true, maxForms: 50 }, users: { enabled: true, maxUsers: 1000 } },
      admin: { theme: 'default', branding: { primaryColor: '#3B82F6', name: 'Test' }, defaultRole: 'admin' as const },
      auth: { provider: 'better-auth', jwtSecret: 'a'.repeat(32), sessionDuration: 86400, refreshTokenDuration: 604800, maxSessionAge: 2592000, passwordMinLength: 8, passwordRequireUppercase: true, passwordRequireLowercase: true, passwordRequireNumbers: true, passwordRequireSpecialChars: false },
      storage: { provider: 'local' as const, path: './uploads', maxFileSize: 10485760, allowedMimeTypes: [] },
      logging: { level: 'info' as const, format: 'pretty' as const, maxFiles: 10, maxSize: '10m' },
      server: { port: 3000, host: '0.0.0.0', cors: { enabled: true, origin: '*', credentials: true }, rateLimit: { enabled: true, windowMs: 60000, maxRequests: 100 } },
      extraKey: 'not allowed',
    };

    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('Config Defaults', () => {
  it('should have valid structure (JWT_SECRET will be validated separately)', () => {
    const defaultsWithValidSecret = {
      ...configDefaults,
      auth: {
        ...configDefaults.auth,
        jwtSecret: 'a'.repeat(32), // Valid secret for structure validation
      },
    };
    const result = validateConfig(defaultsWithValidSecret);
    expect(result.success).toBe(true);
  });
});

describe('Config Loader', () => {
  it('should return null for non-existent file', () => {
    const result = loadConfigFile('/non/existent/file.yaml');
    expect(result).toBeNull();
  });

  it('should deep merge configs', () => {
    const target = {
      a: 1,
      b: {
        c: 2,
        d: 3,
      },
      e: [1, 2, 3],
    };

    const source = {
      b: {
        c: 20,
        f: 40,
      },
      e: [4, 5, 6],
    };

    const result = deepMerge(target, source);
    expect(result).toEqual({
      a: 1,
      b: {
        c: 20,
        d: 3,
        f: 40,
      },
      e: [4, 5, 6],
    });
  });

  it('should interpolate environment variables', () => {
    process.env.TEST_VAR = 'test-value';

    const result = interpolateEnvVars({
      value: '${TEST_VAR}',
      nested: {
        value: '${TEST_VAR}',
      },
      array: ['${TEST_VAR}', 'other'],
    });

    expect(result).toEqual({
      value: 'test-value',
      nested: {
        value: 'test-value',
      },
      array: ['test-value', 'other'],
    });

    delete process.env.TEST_VAR;
  });

  it('should apply environment variable overrides', () => {
    process.env.SERVER_PORT = '4000';
    process.env.DATABASE_DRIVER = 'postgresql';

    const config = {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      database: {
        driver: 'sqlite',
        url: 'file:./test.db',
      },
    };

    const result = applyEnvOverrides(config);

    expect(result.server.port).toBe(4000);
    expect(result.database.driver).toBe('postgresql');

    delete process.env.SERVER_PORT;
    delete process.env.DATABASE_DRIVER;
  });
});

describe('Secrets Validation', () => {
  it('should detect missing JWT secret', () => {
    const config = {
      platform: { name: 'Test', version: '1.0.0' },
      runtime: { adapter: 'node' as const, target: 'vps' as const },
      database: { driver: 'sqlite' as const, url: 'file:./test.db', poolSize: 10, connectionTimeout: 30000 },
      features: { plugins: { enabled: [], disabled: [] }, pages: { enabled: true, maxPages: 100 }, forms: { enabled: true, maxForms: 50 }, users: { enabled: true, maxUsers: 1000 } },
      admin: { theme: 'default', branding: { primaryColor: '#3B82F6', name: 'Test' }, defaultRole: 'admin' as const },
      auth: { provider: 'better-auth', jwtSecret: '', sessionDuration: 86400, refreshTokenDuration: 604800, maxSessionAge: 2592000, passwordMinLength: 8, passwordRequireUppercase: true, passwordRequireLowercase: true, passwordRequireNumbers: true, passwordRequireSpecialChars: false },
      storage: { provider: 'local' as const, path: './uploads', maxFileSize: 10485760, allowedMimeTypes: [] },
      logging: { level: 'info' as const, format: 'pretty' as const, maxFiles: 10, maxSize: '10m' },
      server: { port: 3000, host: '0.0.0.0', cors: { enabled: true, origin: '*', credentials: true }, rateLimit: { enabled: true, windowMs: 60000, maxRequests: 100 } },
    } as Config;

    const missing = checkRequiredSecrets(config);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing[0]).toContain('JWT_SECRET');
  });

  it('should detect short JWT secret', () => {
    const config = {
      platform: { name: 'Test', version: '1.0.0' },
      runtime: { adapter: 'node' as const, target: 'vps' as const },
      database: { driver: 'sqlite' as const, url: 'file:./test.db', poolSize: 10, connectionTimeout: 30000 },
      features: { plugins: { enabled: [], disabled: [] }, pages: { enabled: true, maxPages: 100 }, forms: { enabled: true, maxForms: 50 }, users: { enabled: true, maxUsers: 1000 } },
      admin: { theme: 'default', branding: { primaryColor: '#3B82F6', name: 'Test' }, defaultRole: 'admin' as const },
      auth: { provider: 'better-auth', jwtSecret: 'short', sessionDuration: 86400, refreshTokenDuration: 604800, maxSessionAge: 2592000, passwordMinLength: 8, passwordRequireUppercase: true, passwordRequireLowercase: true, passwordRequireNumbers: true, passwordRequireSpecialChars: false },
      storage: { provider: 'local' as const, path: './uploads', maxFileSize: 10485760, allowedMimeTypes: [] },
      logging: { level: 'info' as const, format: 'pretty' as const, maxFiles: 10, maxSize: '10m' },
      server: { port: 3000, host: '0.0.0.0', cors: { enabled: true, origin: '*', credentials: true }, rateLimit: { enabled: true, windowMs: 60000, maxRequests: 100 } },
    } as Config;

    const missing = checkRequiredSecrets(config);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing[0]).toContain('JWT_SECRET');
  });

  it('should accept valid JWT secret', () => {
    const config = {
      platform: { name: 'Test', version: '1.0.0' },
      runtime: { adapter: 'node' as const, target: 'vps' as const },
      database: { driver: 'sqlite' as const, url: 'file:./test.db', poolSize: 10, connectionTimeout: 30000 },
      features: { plugins: { enabled: [], disabled: [] }, pages: { enabled: true, maxPages: 100 }, forms: { enabled: true, maxForms: 50 }, users: { enabled: true, maxUsers: 1000 } },
      admin: { theme: 'default', branding: { primaryColor: '#3B82F6', name: 'Test' }, defaultRole: 'admin' as const },
      auth: { provider: 'better-auth', jwtSecret: 'a'.repeat(32), sessionDuration: 86400, refreshTokenDuration: 604800, maxSessionAge: 2592000, passwordMinLength: 8, passwordRequireUppercase: true, passwordRequireLowercase: true, passwordRequireNumbers: true, passwordRequireSpecialChars: false },
      storage: { provider: 'local' as const, path: './uploads', maxFileSize: 10485760, allowedMimeTypes: [] },
      logging: { level: 'info' as const, format: 'pretty' as const, maxFiles: 10, maxSize: '10m' },
      server: { port: 3000, host: '0.0.0.0', cors: { enabled: true, origin: '*', credentials: true }, rateLimit: { enabled: true, windowMs: 60000, maxRequests: 100 } },
    } as Config;

    const missing = checkRequiredSecrets(config);
    expect(missing.length).toBe(0);
  });

  it('should detect missing bucket for S3 storage', () => {
    const config = {
      platform: { name: 'Test', version: '1.0.0' },
      runtime: { adapter: 'node' as const, target: 'vps' as const },
      database: { driver: 'sqlite' as const, url: 'file:./test.db', poolSize: 10, connectionTimeout: 30000 },
      features: { plugins: { enabled: [], disabled: [] }, pages: { enabled: true, maxPages: 100 }, forms: { enabled: true, maxForms: 50 }, users: { enabled: true, maxUsers: 1000 } },
      admin: { theme: 'default', branding: { primaryColor: '#3B82F6', name: 'Test' }, defaultRole: 'admin' as const },
      auth: { provider: 'better-auth', jwtSecret: 'a'.repeat(32), sessionDuration: 86400, refreshTokenDuration: 604800, maxSessionAge: 2592000, passwordMinLength: 8, passwordRequireUppercase: true, passwordRequireLowercase: true, passwordRequireNumbers: true, passwordRequireSpecialChars: false },
      storage: { provider: 's3' as const, path: './uploads', maxFileSize: 10485760, allowedMimeTypes: [] },
      logging: { level: 'info' as const, format: 'pretty' as const, maxFiles: 10, maxSize: '10m' },
      server: { port: 3000, host: '0.0.0.0', cors: { enabled: true, origin: '*', credentials: true }, rateLimit: { enabled: true, windowMs: 60000, maxRequests: 100 } },
    } as Config;

    const missing = checkRequiredSecrets(config);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing[0]).toContain('STORAGE_BUCKET');
  });
});
