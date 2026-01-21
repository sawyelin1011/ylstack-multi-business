/**
 * Plugin Loader
 * Loads plugins from filesystem and node_modules
 */

import path from 'path';
import { createLogger } from '../logger';
import type { Plugin, PluginLoadResult } from './types';
import { validatePluginOrThrow } from './validator';

const logger = createLogger({ module: 'PluginLoader' });

const loadedPlugins: Map<string, PluginLoadResult> = new Map();

/**
 * Load plugin from file path
 */
export async function loadPlugin(pluginPath: string): Promise<PluginLoadResult> {
  const resolvedPath = path.resolve(pluginPath);

  logger.debug('Loading plugin from path', { path: resolvedPath });

  try {
    const module = await import(resolvedPath);
    const plugin: Plugin = module.default || module.plugin || module;

    validatePluginOrThrow(plugin);

    const result: PluginLoadResult = {
      plugin,
      path: resolvedPath,
    };

    loadedPlugins.set(plugin.name, result);

    logger.info('Plugin loaded', { name: plugin.name, version: plugin.version });

    return result;
  } catch (error) {
    logger.error('Failed to load plugin', {
      path: resolvedPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Load all plugins from a directory
 */
export async function loadDirectory(dir: string): Promise<PluginLoadResult[]> {
  const resolvedDir = path.resolve(dir);
  logger.debug('Loading plugins from directory', { dir: resolvedDir });

  const fs = await import('fs/promises');
  const { readdir, stat } = fs;

  const results: PluginLoadResult[] = [];

  try {
    const entries = await readdir(resolvedDir);

    for (const entry of entries) {
      const entryPath = path.join(resolvedDir, entry);
      const entryStat = await stat(entryPath);

      if (entryStat.isDirectory()) {
        const packagePath = path.join(entryPath, 'package.json');
        const indexPath = path.join(entryPath, 'index.js');
        const tsIndexPath = path.join(entryPath, 'index.ts');

        let pluginPath = indexPath;

        if (await fileExists(tsIndexPath)) {
          pluginPath = tsIndexPath;
        } else if (!(await fileExists(indexPath))) {
          continue;
        }

        try {
          const result = await loadPlugin(pluginPath);
          results.push(result);
        } catch (error) {
          logger.warn('Failed to load plugin from directory', {
            entry,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } else if (entry.endsWith('.js') || entry.endsWith('.ts')) {
        try {
          const entryPath = path.join(resolvedDir, entry);
          const result = await loadPlugin(entryPath);
          results.push(result);
        } catch (error) {
          logger.warn('Failed to load plugin file', {
            entry,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    logger.info('Plugins loaded from directory', {
      dir: resolvedDir,
      count: results.length,
    });

    return results;
  } catch (error) {
    logger.error('Failed to load directory', {
      dir: resolvedDir,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return results;
  }
}

/**
 * Load plugin from node_modules package
 */
export async function loadFromNodeModules(packageName: string): Promise<PluginLoadResult> {
  logger.debug('Loading plugin from node_modules', { packageName });

  const packagePath = path.resolve(process.cwd(), 'node_modules', packageName);

  try {
    const result = await loadPlugin(packagePath);

    logger.info('Plugin loaded from node_modules', { packageName });

    return result;
  } catch (error) {
    logger.error('Failed to load plugin from node_modules', {
      packageName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(`Failed to load plugin ${packageName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const { stat } = await import('fs/promises');
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get loaded plugin by name
 */
export function getLoadedPlugin(name: string): PluginLoadResult | undefined {
  return loadedPlugins.get(name);
}

/**
 * Get all loaded plugins
 */
export function getAllLoadedPlugins(): PluginLoadResult[] {
  return Array.from(loadedPlugins.values());
}

/**
 * Clear loaded plugins cache
 */
export function clearLoadedPlugins(): void {
  loadedPlugins.clear();
  logger.info('Loaded plugins cache cleared');
}
