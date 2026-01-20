/**
 * Plugin Validator
 * Validates plugin structure and configuration
 */

import semver from 'semver';
import { createLogger } from '../logger';
import type { Plugin } from './types';
import { PluginValidationError } from '../auth/errors';

const logger = createLogger({ module: 'PluginValidator' });

/**
 * Validate plugin name format
 */
function validatePluginName(name: string): boolean {
  const pattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
  return pattern.test(name);
}

/**
 * Validate semantic version
 */
function validateVersion(version: string): boolean {
  return semver.valid(version) !== null;
}

/**
 * Check for circular dependencies
 */
function checkCircularDependencies(
  name: string,
  dependencies: string[] = [],
  allPlugins: Map<string, Plugin>,
  visited: Set<string> = new Set(),
  recursionStack: Set<string> = new Set()
): boolean {
  visited.add(name);
  recursionStack.add(name);

  for (const dep of dependencies) {
    if (!visited.has(dep)) {
      const depPlugin = allPlugins.get(dep);
      if (depPlugin?.dependencies) {
        if (checkCircularDependencies(dep, depPlugin.dependencies, allPlugins, visited, recursionStack)) {
          return true;
        }
      }
    } else if (recursionStack.has(dep)) {
      return true;
    }
  }

  recursionStack.delete(name);
  return false;
}

/**
 * Validate a plugin object
 */
export function validatePlugin(
  plugin: Plugin,
  allPlugins: Map<string, Plugin> = new Map()
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  logger.debug('Validating plugin', { name: plugin.name });

  if (!plugin.name || typeof plugin.name !== 'string') {
    errors.push('Plugin name is required and must be a string');
  } else if (!validatePluginName(plugin.name)) {
    errors.push(
      `Invalid plugin name: ${plugin.name}. Name must be lowercase with hyphens (e.g., my-plugin)`
    );
  }

  if (!plugin.version || typeof plugin.version !== 'string') {
    errors.push('Plugin version is required and must be a string');
  } else if (!validateVersion(plugin.version)) {
    errors.push(
      `Invalid version: ${plugin.version}. Must follow semantic versioning (e.g., 1.0.0)`
    );
  }

  if (plugin.dependencies && !Array.isArray(plugin.dependencies)) {
    errors.push('Dependencies must be an array');
  }

  if (plugin.dependencies && plugin.dependencies.length > 0) {
    for (const dep of plugin.dependencies) {
      const depPlugin = allPlugins.get(dep);
      if (!depPlugin) {
        errors.push(`Dependency not found: ${dep}`);
      }
    }

    if (checkCircularDependencies(plugin.name, plugin.dependencies, allPlugins)) {
      errors.push('Circular dependency detected');
    }
  }

  if (!plugin.lifecycle || typeof plugin.lifecycle !== 'object') {
    errors.push('Lifecycle object is required');
  }

  if (plugin.routes && !Array.isArray(plugin.routes)) {
    errors.push('Routes must be an array');
  }

  if (plugin.middleware && !Array.isArray(plugin.middleware)) {
    errors.push('Middleware must be an array');
  }

  if (plugin.models && !Array.isArray(plugin.models)) {
    errors.push('Models must be an array');
  }

  if (plugin.services && !Array.isArray(plugin.services)) {
    errors.push('Services must be an array');
  }

  if (plugin.adminPages && !Array.isArray(plugin.adminPages)) {
    errors.push('Admin pages must be an array');
  }

  if (plugin.hooks && !Array.isArray(plugin.hooks)) {
    errors.push('Hooks must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate plugin manifest (for database storage)
 */
export function validateManifest(manifest: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push('Manifest name is required');
  }

  if (!manifest.version || typeof manifest.version !== 'string') {
    errors.push('Manifest version is required');
  }

  if (typeof manifest.enabled !== 'boolean') {
    errors.push('Manifest enabled flag is required');
  }

  if (!manifest.installedAt || typeof manifest.installedAt !== 'number') {
    errors.push('Manifest installedAt timestamp is required');
  }

  if (!manifest.updatedAt || typeof manifest.updatedAt !== 'number') {
    errors.push('Manifest updatedAt timestamp is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate plugin configuration
 */
export function validateConfig(
  config: Record<string, any>,
  schema: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, definition] of Object.entries(schema)) {
    const value = config[key];

    if (definition.required && (value === undefined || value === null)) {
      errors.push(`Required config key missing: ${key}`);
      continue;
    }

    if (value !== undefined && value !== null) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;

      if (definition.type !== actualType) {
        errors.push(
          `Invalid type for ${key}: expected ${definition.type}, got ${actualType}`
        );
      }

      if (definition.options && !definition.options.includes(value)) {
        errors.push(
          `Invalid value for ${key}: must be one of ${definition.options.join(', ')}`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Throw error if plugin is invalid
 */
export function validatePluginOrThrow(
  plugin: Plugin,
  allPlugins?: Map<string, Plugin>
): void {
  const result = validatePlugin(plugin, allPlugins);

  if (!result.valid) {
    throw new PluginValidationError(result.errors.join('; '));
  }
}

/**
 * Throw error if manifest is invalid
 */
export function validateManifestOrThrow(manifest: any): void {
  const result = validateManifest(manifest);

  if (!result.valid) {
    throw new PluginValidationError(result.errors.join('; '));
  }
}

/**
 * Throw error if config is invalid
 */
export function validateConfigOrThrow(
  config: Record<string, any>,
  schema: Record<string, any>
): void {
  const result = validateConfig(config, schema);

  if (!result.valid) {
    throw new PluginValidationError(result.errors.join('; '));
  }
}
