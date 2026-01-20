/**
 * Plugin Manager
 * Main orchestrator for plugin lifecycle
 */

import { getDb } from '../db';
import { pluginsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { createLogger } from '../logger';
import { hookSystem } from './hook-system';
import { pluginRegistry } from './registry';
import {
  loadDirectory,
  getLoadedPlugin,
  clearLoadedPlugins,
} from './loader';
import type { Plugin, PluginConfig, PluginContext } from './types';
import {
  PluginNotFoundError,
  PluginAlreadyInstalledError,
  PluginDependencyError,
} from '../auth/errors';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger({ module: 'PluginManager' });

/**
 * Create plugin context
 */
function createPluginContext(plugin: Plugin): PluginContext {
  return {
    db: getDb(),
    config: {},
    logger: createLogger({ module: `Plugin:${plugin.name}` }),
    pluginName: plugin.name,
    pluginVersion: plugin.version,
  };
}

/**
 * Initialize plugins from directory
 */
export async function initializePlugins(pluginsDir: string): Promise<void> {
  logger.info('Initializing plugins from directory', { dir: pluginsDir });

  const results = await loadDirectory(pluginsDir);

  for (const { plugin } of results) {
    pluginRegistry.register(plugin);
  }

  logger.info('Plugins initialized', { count: results.length });
}

/**
 * Install a plugin
 */
export async function installPlugin(
  plugin: Plugin,
  config?: PluginConfig
): Promise<void> {
  logger.info('Installing plugin', { name: plugin.name, version: plugin.version });

  const db = getDb();

  if (pluginRegistry.isInstalled(plugin.name)) {
    throw new PluginAlreadyInstalledError(plugin.name);
  }

  if (plugin.dependencies && plugin.dependencies.length > 0) {
    const { satisfied, missing } = pluginRegistry.checkDependencies(plugin.name);

    if (!satisfied) {
      throw new PluginDependencyError(
        `Missing dependencies: ${missing.join(', ')}`
      );
    }
  }

  pluginRegistry.register(plugin);

  const ctx = createPluginContext(plugin);

  if (plugin.lifecycle.install) {
    try {
      await plugin.lifecycle.install(ctx);
      logger.info('Plugin install lifecycle completed', { name: plugin.name });
    } catch (error) {
      logger.error('Plugin install lifecycle failed', {
        name: plugin.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      pluginRegistry.unregister(plugin.name);
      throw error;
    }
  }

  await db.insert(pluginsTable).values({
    id: uuidv4(),
    name: plugin.name,
    version: plugin.version,
    enabled: false,
    config: config ? JSON.stringify(config) : null,
    installedAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  });

  pluginRegistry.updateManifest(plugin.name, {
    enabled: false,
    config,
  });

  await hookSystem.execute('plugin:install', { pluginName: plugin.name }, {
    pluginName: 'core',
  });

  logger.info('Plugin installed', { name: plugin.name });
}

/**
 * Uninstall a plugin
 */
export async function uninstallPlugin(pluginName: string): Promise<void> {
  logger.info('Uninstalling plugin', { name: pluginName });

  const plugin = pluginRegistry.get(pluginName);

  if (!plugin) {
    throw new PluginNotFoundError(pluginName);
  }

  if (pluginRegistry.isActive(pluginName)) {
    await deactivatePlugin(pluginName);
  }

  const dependents = pluginRegistry.getDependents(pluginName);

  if (dependents.length > 0) {
    throw new PluginDependencyError(
      `Cannot uninstall plugin ${pluginName}. Dependent plugins: ${dependents.map(p => p.name).join(', ')}`
    );
  }

  const ctx = createPluginContext(plugin);

  if (plugin.lifecycle.uninstall) {
    try {
      await plugin.lifecycle.uninstall(ctx);
      logger.info('Plugin uninstall lifecycle completed', { name: pluginName });
    } catch (error) {
      logger.error('Plugin uninstall lifecycle failed', {
        name: pluginName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  const db = getDb();
  await db.delete(pluginsTable).where(eq(pluginsTable.name, pluginName));

  hookSystem.unregisterPlugin(pluginName);
  pluginRegistry.unregister(pluginName);

  await hookSystem.execute('plugin:uninstall', { pluginName }, {
    pluginName: 'core',
  });

  logger.info('Plugin uninstalled', { name: pluginName });
}

/**
 * Activate a plugin
 */
export async function activatePlugin(pluginName: string): Promise<void> {
  logger.info('Activating plugin', { name: pluginName });

  const plugin = pluginRegistry.get(pluginName);

  if (!plugin) {
    throw new PluginNotFoundError(pluginName);
  }

  if (pluginRegistry.isActive(pluginName)) {
    logger.info('Plugin already active', { name: pluginName });
    return;
  }

  if (plugin.dependencies && plugin.dependencies.length > 0) {
    for (const dep of plugin.dependencies) {
      if (!pluginRegistry.isActive(dep)) {
        try {
          await activatePlugin(dep);
        } catch (error) {
          throw new PluginDependencyError(
            `Failed to activate dependency ${dep}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }
  }

  const ctx = createPluginContext(plugin);

  if (plugin.lifecycle.activate) {
    try {
      await plugin.lifecycle.activate(ctx);
      logger.info('Plugin activate lifecycle completed', { name: pluginName });
    } catch (error) {
      logger.error('Plugin activate lifecycle failed', {
        name: pluginName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  const db = getDb();
  await db
    .update(pluginsTable)
    .set({ enabled: true, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(pluginsTable.name, pluginName));

  pluginRegistry.updateManifest(pluginName, { enabled: true });

  if (plugin.hooks) {
    for (const hookDef of plugin.hooks) {
      hookSystem.register(
        hookDef.name,
        hookDef.handler,
        hookDef.priority || 0,
        pluginName
      );
    }
  }

  await hookSystem.execute('plugin:activate', { pluginName }, {
    pluginName: 'core',
  });

  logger.info('Plugin activated', { name: pluginName });
}

/**
 * Deactivate a plugin
 */
export async function deactivatePlugin(pluginName: string): Promise<void> {
  logger.info('Deactivating plugin', { name: pluginName });

  const plugin = pluginRegistry.get(pluginName);

  if (!plugin) {
    throw new PluginNotFoundError(pluginName);
  }

  if (!pluginRegistry.isActive(pluginName)) {
    logger.info('Plugin already inactive', { name: pluginName });
    return;
  }

  const dependents = pluginRegistry
    .getDependents(pluginName)
    .filter(p => pluginRegistry.isActive(p.name));

  if (dependents.length > 0) {
    throw new PluginDependencyError(
      `Cannot deactivate plugin ${pluginName}. Active dependent plugins: ${dependents.map(p => p.name).join(', ')}`
    );
  }

  hookSystem.unregisterPlugin(pluginName);

  const ctx = createPluginContext(plugin);

  if (plugin.lifecycle.deactivate) {
    try {
      await plugin.lifecycle.deactivate(ctx);
      logger.info('Plugin deactivate lifecycle completed', { name: pluginName });
    } catch (error) {
      logger.error('Plugin deactivate lifecycle failed', {
        name: pluginName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  const db = getDb();
  await db
    .update(pluginsTable)
    .set({ enabled: false, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(pluginsTable.name, pluginName));

  pluginRegistry.updateManifest(pluginName, { enabled: false });

  await hookSystem.execute('plugin:deactivate', { pluginName }, {
    pluginName: 'core',
  });

  logger.info('Plugin deactivated', { name: pluginName });
}

/**
 * Get plugin by name
 */
export function getPlugin(name: string): Plugin | null {
  return pluginRegistry.get(name);
}

/**
 * Get all plugins
 */
export function listAllPlugins(): Plugin[] {
  return pluginRegistry.getAll();
}

/**
 * Get active plugins
 */
export function getActivePlugins(): Plugin[] {
  return pluginRegistry.getActive();
}

/**
 * Get plugins with routes
 */
export function getPluginsWithRoutes(): Plugin[] {
  return pluginRegistry.getByCapability('routes');
}

/**
 * Get plugins with admin pages
 */
export function getPluginsWithAdminPages(): Plugin[] {
  return pluginRegistry.getByCapability('adminPages');
}
