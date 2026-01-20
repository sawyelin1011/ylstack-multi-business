import { configSchema, type Config } from './schema';
import {
  loadConfigFile,
  loadAndMergeConfig,
  deepMerge,
  interpolateEnvVars,
  applyEnvOverrides,
  type LoadConfigOptions,
  type EnvVarMap,
  DEFAULT_ENV_VAR_MAP,
} from './loader';
import {
  validateConfig,
  assertValidConfig,
  validateSecrets,
  checkRequiredSecrets,
  type ValidationResult,
  type ValidationError,
  printValidationErrors,
  ConfigValidationError,
} from './validator';
import { configDefaults } from './defaults';
import type { LoadedConfig, ConfigMetadata, GetConfigOptions } from './types';

let cachedConfig: Config | null = null;
let configMetadata: ConfigMetadata | null = null;

export function getConfig(
  options: GetConfigOptions = {}
): Config {
  const {
    skipValidation = false,
    skipSecretsCheck = false,
    throwOnError = true,
  } = options;

  if (cachedConfig) {
    return cachedConfig;
  }

  const startTime = Date.now();

  try {
    const mergedConfig = loadAndMergeConfig();
    const finalConfig = deepMerge(configDefaults, mergedConfig);

    if (!skipValidation) {
      if (throwOnError) {
        assertValidConfig(finalConfig);
      } else {
        const result = validateConfig(finalConfig);
        if (!result.success) {
          console.warn('Configuration validation failed, using defaults where possible');
          if (result.errors) {
            printValidationErrors(result.errors);
          }
        }
      }
    }

    const validatedConfig = throwOnError
      ? assertValidConfig(finalConfig)
      : validateConfig(finalConfig).data || configDefaults;

    if (!skipSecretsCheck) {
      try {
        validateSecrets(validatedConfig);
      } catch (error) {
        if (throwOnError) {
          throw error;
        }
        console.warn('Secrets validation failed:', error);
      }
    }

    const validationTime = Date.now() - startTime;

    cachedConfig = validatedConfig;
    configMetadata = {
      loadedAt: new Date(),
      sources: getConfigSources(),
      validationTime,
    };

    return cachedConfig;
  } catch (error) {
    if (throwOnError) {
      throw error;
    }
    console.error('Failed to load configuration:', error);
    return configDefaults;
  }
}

export function getMetadata(): ConfigMetadata | null {
  return configMetadata;
}

export function reloadConfig(options: GetConfigOptions = {}): Config {
  cachedConfig = null;
  configMetadata = null;
  return getConfig(options);
}

export function getConfigSources() {
  const sources = [];
  const cwd = process.cwd();

  if (require('fs').existsSync(cwd + '/config.yaml')) {
    sources.push({
      type: 'file' as const,
      path: 'config.yaml',
      timestamp: new Date(),
    });
  }

  if (require('fs').existsSync(cwd + '/config.local.yaml')) {
    sources.push({
      type: 'file' as const,
      path: 'config.local.yaml',
      timestamp: new Date(),
    });
  }

  const envVars = Object.keys(DEFAULT_ENV_VAR_MAP).filter((key) => process.env[key] !== undefined);
  if (envVars.length > 0) {
    sources.push({
      type: 'env' as const,
      timestamp: new Date(),
    });
  }

  return sources;
}

export function getPlatformConfig() {
  return getConfig().platform;
}

export function getRuntimeConfig() {
  return getConfig().runtime;
}

export function getDatabaseConfig() {
  return getConfig().database;
}

export function getFeaturesConfig() {
  return getConfig().features;
}

export function getAdminConfig() {
  return getConfig().admin;
}

export function getAuthConfig() {
  return getConfig().auth;
}

export function getStorageConfig() {
  return getConfig().storage;
}

export function getLoggingConfig() {
  return getConfig().logging;
}

export function getServerConfig() {
  return getConfig().server;
}

export function validate(config: unknown): ValidationResult<Config> {
  return validateConfig(config);
}

export function assertValid(config: unknown): Config {
  return assertValidConfig(config);
}

export function checkSecrets(config: Config): string[] {
  return checkRequiredSecrets(config);
}

export function isValidSecrets(config: Config): boolean {
  return checkRequiredSecrets(config).length === 0;
}

export * from './schema';
export * from './types';

export {
  loadConfigFile,
  loadAndMergeConfig,
  deepMerge,
  interpolateEnvVars,
  applyEnvOverrides,
  DEFAULT_ENV_VAR_MAP,
};

export type { LoadConfigOptions, EnvVarMap };

export {
  printValidationErrors,
  ConfigValidationError,
};

export type { ValidationResult, ValidationError };
