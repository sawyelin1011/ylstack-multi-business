import type { Config } from './schema';

export const configDefaults: Config = {
  platform: {
    name: 'YLStack',
    version: '1.0.0',
  },
  runtime: {
    adapter: 'node',
    target: 'vps',
  },
  database: {
    driver: 'sqlite',
    url: 'file:./data/app.db',
    poolSize: 10,
    connectionTimeout: 30000,
  },
  features: {
    plugins: {
      enabled: ['plugin-pages', 'plugin-forms'],
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
      name: 'YLStack Admin',
    },
    defaultRole: 'admin',
  },
  auth: {
    provider: 'better-auth',
    jwtSecret: '',
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
    provider: 'local',
    path: './uploads',
    maxFileSize: 10485760,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ],
  },
  logging: {
    level: 'info',
    format: 'pretty',
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
