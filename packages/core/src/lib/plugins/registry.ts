/**
 * Plugin Registry
 * Stores and manages plugin metadata
 */

import { createLogger } from '../logger';
import type { Plugin, PluginManifest, PluginState } from './types';
import { validatePluginOrThrow } from './validator';

const logger = createLogger({ module: 'PluginRegistry' });

class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private manifests: Map<string, PluginManifest> = new Map();

  /**
   * Register a plugin
   */
  register(plugin: Plugin): void {
    logger.info('Registering plugin', { name: plugin.name, version: plugin.version });

    validatePluginOrThrow(plugin, this.plugins);

    this.plugins.set(plugin.name, plugin);

    logger.info('Plugin registered', { name: plugin.name });
  }

  /**
   * Unregister a plugin
   */
  unregister(name: string): boolean {
    logger.info('Unregistering plugin', { name });

    const exists = this.plugins.has(name);

    this.plugins.delete(name);
    this.manifests.delete(name);

    return exists;
  }

  /**
   * Get plugin by name
   */
  get(name: string): Plugin | null {
    return this.plugins.get(name) || null;
  }

  /**
   * Get all plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get active plugins
   */
  getActive(): Plugin[] {
    return this.getAll().filter(plugin => {
      const manifest = this.manifests.get(plugin.name);
      return manifest?.enabled === true;
    });
  }

  /**
   * Get plugins by capability
   */
  getByCapability(capability: keyof Plugin): Plugin[] {
    return this.getAll().filter(plugin => {
      const cap = plugin[capability];
      return cap && (Array.isArray(cap) ? cap.length > 0 : true);
    });
  }

  /**
   * Update plugin manifest
   */
  updateManifest(name: string, manifest: Partial<PluginManifest>): void {
    logger.debug('Updating plugin manifest', { name });

    const existing = this.manifests.get(name);

    const updated: PluginManifest = {
      name,
      version: existing?.version || '0.0.0',
      enabled: existing?.enabled ?? true,
      installedAt: existing?.installedAt || Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
      ...(existing || {}),
      ...manifest,
    };

    this.manifests.set(name, updated);
  }

  /**
   * Get plugin manifest
   */
  getManifest(name: string): PluginManifest | null {
    return this.manifests.get(name) || null;
  }

  /**
   * Get all manifests
   */
  getAllManifests(): PluginManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Get plugin state
   */
  getPluginState(name: string): PluginState {
    const plugin = this.plugins.get(name);
    const manifest = this.manifests.get(name);

    if (!plugin) {
      return 'error';
    }

    if (!manifest) {
      return 'installed';
    }

    return manifest.enabled ? 'active' : 'inactive';
  }

  /**
   * Check if plugin is installed
   */
  isInstalled(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Check if plugin is active
   */
  isActive(name: string): boolean {
    const manifest = this.manifests.get(name);
    return manifest?.enabled === true;
  }

  /**
   * Get dependencies for a plugin
   */
  getDependencies(name: string): string[] {
    const plugin = this.plugins.get(name);
    return plugin?.dependencies || [];
  }

  /**
   * Check if plugin dependencies are satisfied
   */
  checkDependencies(name: string): { satisfied: boolean; missing: string[] } {
    const plugin = this.plugins.get(name);
    const dependencies = plugin?.dependencies || [];
    const missing: string[] = [];

    for (const dep of dependencies) {
      if (!this.plugins.has(dep)) {
        missing.push(dep);
      }
    }

    return {
      satisfied: missing.length === 0,
      missing,
    };
  }

  /**
   * Get dependent plugins (plugins that depend on this one)
   */
  getDependents(name: string): Plugin[] {
    return this.getAll().filter(plugin =>
      plugin.dependencies?.includes(name)
    );
  }

  /**
   * Clear all plugins (useful for testing)
   */
  clear(): void {
    this.plugins.clear();
    this.manifests.clear();
  }
}

const pluginRegistry = new PluginRegistry();

export { pluginRegistry, PluginRegistry };
export default pluginRegistry;
