import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';

export interface LoadConfigOptions {
  configPath?: string;
  localConfigPath?: string;
  envPrefix?: string;
}

export function loadConfigFile(filePath: string): Record<string, any> | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath);

    if (ext === '.yaml' || ext === '.yml') {
      return YAML.parse(content) || {};
    } else if (ext === '.json') {
      return JSON.parse(content) || {};
    } else {
      throw new Error(`Unsupported config file format: ${ext}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config file at ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (sourceValue === undefined || sourceValue === null) {
      continue;
    }

    if (
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      (result as any)[key] = deepMerge(targetValue, sourceValue);
    } else {
      (result as any)[key] = sourceValue;
    }
  }

  return result;
}

export function setNestedProperty(
  obj: Record<string, any>,
  path: string,
  value: any
): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

export function interpolateEnvVars(value: any): any {
  if (typeof value === 'string') {
    return value.replace(/\$\{([^}]+)\}/g, (_match, varName) => {
      const envValue = process.env[varName];
      if (envValue === undefined) {
        console.warn(`Warning: Environment variable ${varName} is not set`);
      }
      return envValue || '';
    });
  }

  if (Array.isArray(value)) {
    return value.map(interpolateEnvVars);
  }

  if (value && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const key in value) {
      result[key] = interpolateEnvVars(value[key]);
    }
    return result;
  }

  return value;
}

export type EnvVarMap = Record<string, string>;

export const DEFAULT_ENV_VAR_MAP: EnvVarMap = {
  // Platform
  PLATFORM_NAME: 'platform.name',
  PLATFORM_VERSION: 'platform.version',
  PLATFORM_DESCRIPTION: 'platform.description',

  // Runtime
  RUNTIME_ADAPTER: 'runtime.adapter',
  RUNTIME_TARGET: 'runtime.target',

  // Database
  DATABASE_DRIVER: 'database.driver',
  DATABASE_URL: 'database.url',
  DATABASE_POOL_SIZE: 'database.poolSize',
  DATABASE_CONNECTION_TIMEOUT: 'database.connectionTimeout',

  // Features
  PLUGINS_ENABLED: 'features.plugins.enabled',
  PLUGINS_DISABLED: 'features.plugins.disabled',
  PAGES_ENABLED: 'features.pages.enabled',
  FORMS_ENABLED: 'features.forms.enabled',
  USERS_ENABLED: 'features.users.enabled',

  // Admin
  ADMIN_THEME: 'admin.theme',
  ADMIN_LOGO: 'admin.branding.logo',
  ADMIN_FAVICON: 'admin.branding.favicon',
  ADMIN_PRIMARY_COLOR: 'admin.branding.primaryColor',
  ADMIN_BRAND_NAME: 'admin.branding.name',
  ADMIN_DEFAULT_ROLE: 'admin.defaultRole',

  // Auth
  AUTH_PROVIDER: 'auth.provider',
  JWT_SECRET: 'auth.jwtSecret',
  AUTH_SESSION_DURATION: 'auth.sessionDuration',
  AUTH_REFRESH_TOKEN_DURATION: 'auth.refreshTokenDuration',
  AUTH_MAX_SESSION_AGE: 'auth.maxSessionAge',
  AUTH_PASSWORD_MIN_LENGTH: 'auth.passwordMinLength',
  AUTH_PASSWORD_REQUIRE_UPPERCASE: 'auth.passwordRequireUppercase',
  AUTH_PASSWORD_REQUIRE_LOWERCASE: 'auth.passwordRequireLowercase',
  AUTH_PASSWORD_REQUIRE_NUMBERS: 'auth.passwordRequireNumbers',
  AUTH_PASSWORD_REQUIRE_SPECIAL_CHARS: 'auth.passwordRequireSpecialChars',

  // Storage
  STORAGE_PROVIDER: 'storage.provider',
  STORAGE_PATH: 'storage.path',
  STORAGE_BUCKET: 'storage.bucket',
  STORAGE_REGION: 'storage.region',
  STORAGE_MAX_FILE_SIZE: 'storage.maxFileSize',

  // Logging
  LOG_LEVEL: 'logging.level',
  LOG_FORMAT: 'logging.format',
  LOG_FILE: 'logging.file',
  LOG_MAX_FILES: 'logging.maxFiles',
  LOG_MAX_SIZE: 'logging.maxSize',

  // Server
  SERVER_PORT: 'server.port',
  SERVER_HOST: 'server.host',
  CORS_ENABLED: 'server.cors.enabled',
  CORS_ORIGIN: 'server.cors.origin',
  CORS_CREDENTIALS: 'server.cors.credentials',
  RATE_LIMIT_ENABLED: 'server.rateLimit.enabled',
  RATE_LIMIT_WINDOW_MS: 'server.rateLimit.windowMs',
  RATE_LIMIT_MAX_REQUESTS: 'server.rateLimit.maxRequests',
};

export function applyEnvOverrides(
  config: Record<string, any>,
  envVarMap: EnvVarMap = DEFAULT_ENV_VAR_MAP
): Record<string, any> {
  const result = JSON.parse(JSON.stringify(config));

  for (const [envVar, configPath] of Object.entries(envVarMap)) {
    const envValue = process.env[envVar];

    if (envValue === undefined || envValue === '') {
      continue;
    }

    try {
      const value = parseEnvValue(envValue);
      setNestedProperty(result, configPath, value);
    } catch (error) {
      console.warn(
        `Warning: Failed to parse environment variable ${envVar}: ${error}`
      );
    }
  }

  return result;
}

function parseEnvValue(value: string): any {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;

  if (/^\d+$/.test(value)) {
    return parseInt(value, 10);
  }

  if (/^\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }

  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.split(',').map((v) => v.trim());
    }
  }

  return value;
}

export function loadAndMergeConfig(
  options: LoadConfigOptions = {}
): Record<string, any> {
  const configPath = options.configPath || path.join(process.cwd(), 'config.yaml');
  const localConfigPath =
    options.localConfigPath || path.join(process.cwd(), 'config.local.yaml');

  let config: Record<string, any> = {};

  if (fs.existsSync(configPath)) {
    const loaded = loadConfigFile(configPath);
    if (loaded) {
      config = loaded;
    }
  }

  if (fs.existsSync(localConfigPath)) {
    const loaded = loadConfigFile(localConfigPath);
    if (loaded) {
      config = deepMerge(config, loaded);
    }
  }

  config = interpolateEnvVars(config);
  config = applyEnvOverrides(config, options.envPrefix ? createPrefixedEnvMap(options.envPrefix) : undefined);

  return config;
}

function createPrefixedEnvMap(prefix: string): EnvVarMap {
  const map: EnvVarMap = {};
  for (const [key, value] of Object.entries(DEFAULT_ENV_VAR_MAP)) {
    map[`${prefix}_${key}`] = value;
  }
  return map;
}
