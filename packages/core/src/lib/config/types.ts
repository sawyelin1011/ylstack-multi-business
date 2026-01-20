export type {
  PlatformConfig,
  RuntimeConfig,
  DatabaseConfig,
  FeaturesConfig,
  AdminConfig,
  AuthConfig,
  StorageConfig,
  LoggingConfig,
  ServerConfig,
} from './schema';

export type { LoadConfigOptions, EnvVarMap } from './loader';

export type { ValidationResult, ValidationError } from './validator';

// Import Config separately to avoid circular dependency
import type { Config } from './schema';

export interface LoadedConfig {
  config: Config;
  sources: ConfigSource[];
}

export interface ConfigSource {
  type: 'file' | 'env' | 'default';
  path?: string;
  timestamp: Date;
}

export interface ConfigMetadata {
  loadedAt: Date;
  sources: ConfigSource[];
  validationTime: number;
}

export interface GetConfigOptions {
  skipValidation?: boolean;
  skipSecretsCheck?: boolean;
  throwOnError?: boolean;
}

// Re-export Config from schema
export type { Config } from './schema';

