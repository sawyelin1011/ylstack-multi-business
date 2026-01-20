import { z } from 'zod';

export const platformConfigSchema = z.object({
  name: z.string().default('YLStack'),
  version: z.string().default('1.0.0'),
  description: z.string().optional(),
});

export const runtimeConfigSchema = z.object({
  adapter: z.enum(['node', 'cloudflare']).default('node'),
  target: z.enum(['vps', 'docker', 'pm2', 'workers']).default('vps'),
});

export const databaseConfigSchema = z.object({
  driver: z.enum(['sqlite', 'postgresql', 'd1', 'libsql']).default('sqlite'),
  url: z.string().default('file:./data/app.db'),
  poolSize: z.number().int().positive().default(10),
  connectionTimeout: z.number().int().positive().default(30000),
});

export const featuresConfigSchema = z.object({
  plugins: z.object({
    enabled: z.array(z.string()).default(['plugin-pages', 'plugin-forms']),
    disabled: z.array(z.string()).default([]),
  }),
  pages: z.object({
    enabled: z.boolean().default(true),
    maxPages: z.number().int().positive().default(100),
  }),
  forms: z.object({
    enabled: z.boolean().default(true),
    maxForms: z.number().int().positive().default(50),
  }),
  users: z.object({
    enabled: z.boolean().default(true),
    maxUsers: z.number().int().positive().default(1000),
  }),
});

export const adminConfigSchema = z.object({
  theme: z.string().default('default'),
  branding: z.object({
    logo: z.string().optional(),
    favicon: z.string().optional(),
    primaryColor: z.string().default('#3B82F6'),
    name: z.string().default('YLStack Admin'),
  }),
  defaultRole: z.enum(['admin', 'editor', 'viewer']).default('admin'),
});

export const authConfigSchema = z.object({
  provider: z.string().default('better-auth'),
  jwtSecret: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  sessionDuration: z.number().int().positive().default(86400),
  refreshTokenDuration: z.number().int().positive().default(604800),
  maxSessionAge: z.number().int().positive().default(2592000),
  passwordMinLength: z.number().int().positive().default(8),
  passwordRequireUppercase: z.boolean().default(true),
  passwordRequireLowercase: z.boolean().default(true),
  passwordRequireNumbers: z.boolean().default(true),
  passwordRequireSpecialChars: z.boolean().default(false),
});

export const storageConfigSchema = z.object({
  provider: z.enum(['local', 's3', 'r2']).default('local'),
  path: z.string().default('./uploads'),
  bucket: z.string().optional(),
  region: z.string().optional(),
  maxFileSize: z.number().int().positive().default(10485760),
  allowedMimeTypes: z.array(z.string()).default([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ]),
});

export const loggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  format: z.enum(['json', 'pretty']).default('pretty'),
  file: z.string().optional(),
  maxFiles: z.number().int().positive().default(10),
  maxSize: z.string().default('10m'),
});

export const serverConfigSchema = z.object({
  port: z.number().int().positive().default(3000),
  host: z.string().default('0.0.0.0'),
  cors: z.object({
    enabled: z.boolean().default(true),
    origin: z.union([z.string(), z.array(z.string())]).default('*'),
    credentials: z.boolean().default(true),
  }),
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    windowMs: z.number().int().positive().default(60000),
    maxRequests: z.number().int().positive().default(100),
  }),
});

export const configSchema = z.object({
  platform: platformConfigSchema,
  runtime: runtimeConfigSchema,
  database: databaseConfigSchema,
  features: featuresConfigSchema,
  admin: adminConfigSchema,
  auth: authConfigSchema,
  storage: storageConfigSchema,
  logging: loggingConfigSchema,
  server: serverConfigSchema,
}).strict();

export type Config = z.infer<typeof configSchema>;
export type PlatformConfig = z.infer<typeof platformConfigSchema>;
export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
export type FeaturesConfig = z.infer<typeof featuresConfigSchema>;
export type AdminConfig = z.infer<typeof adminConfigSchema>;
export type AuthConfig = z.infer<typeof authConfigSchema>;
export type StorageConfig = z.infer<typeof storageConfigSchema>;
export type LoggingConfig = z.infer<typeof loggingConfigSchema>;
export type ServerConfig = z.infer<typeof serverConfigSchema>;
