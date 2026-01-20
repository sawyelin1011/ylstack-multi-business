/**
 * Plugin System Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validatePlugin, validateManifest, validateConfig } from '../validator';
import { pluginRegistry } from '../registry';
import { hookSystem } from '../hook-system';
import { createPlugin as createBuilder } from '../sdk/plugin-builder';
import {
  installPlugin,
  uninstallPlugin,
  activatePlugin,
  deactivatePlugin,
  getPlugin,
  listAllPlugins,
  getActivePlugins,
} from '../manager';
import { PluginValidationError } from '../../auth/errors';
import { initializeDb, closeDb } from '../../../db';
import { createLogger } from '../../../logger';

const logger = createLogger({ module: 'PluginTests' });

describe('Plugin Validation', () => {
  it('should validate a valid plugin', () => {
    const plugin = createBuilder('my-plugin', '1.0.0')
      .metadata({ description: 'Test plugin' })
      .lifecycle({})
      .build();

    const result = validatePlugin(plugin);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject plugin with invalid name', () => {
    const plugin = createBuilder('Invalid_Name', '1.0.0')
      .lifecycle({})
      .build();

    const result = validatePlugin(plugin);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid plugin name'))).toBe(true);
  });

  it('should reject plugin without name', () => {
    const plugin = { version: '1.0.0', lifecycle: {} };

    const result = validatePlugin(plugin as any);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Plugin name is required and must be a string');
  });

  it('should reject plugin without version', () => {
    const plugin = createBuilder('test-plugin', '' as any)
      .lifecycle({})
      .build();

    const result = validatePlugin(plugin);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Plugin version is required and must be a string');
  });

  it('should reject plugin with invalid version', () => {
    const plugin = createBuilder('test-plugin', 'invalid')
      .lifecycle({})
      .build();

    const result = validatePlugin(plugin);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid version');
  });

  it('should detect circular dependencies', () => {
    const pluginA = createBuilder('plugin-a', '1.0.0')
      .dependencies('plugin-b')
      .lifecycle({})
      .build();

    const pluginB = createBuilder('plugin-b', '1.0.0')
      .dependencies('plugin-a')
      .lifecycle({})
      .build();

    const allPlugins = new Map([['plugin-a', pluginA], ['plugin-b', pluginB]]);

    const result = validatePlugin(pluginA, allPlugins);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Circular dependency detected');
  });

  it('should detect missing dependencies', () => {
    const plugin = createBuilder('test-plugin', '1.0.0')
      .dependencies('non-existent')
      .lifecycle({})
      .build();

    const allPlugins = new Map();

    const result = validatePlugin(plugin, allPlugins);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Dependency not found: non-existent');
  });

  it('should validate manifest correctly', () => {
    const manifest = {
      name: 'test-plugin',
      version: '1.0.0',
      enabled: true,
      installedAt: Date.now(),
      updatedAt: Date.now(),
    };

    const result = validateManifest(manifest);

    expect(result.valid).toBe(true);
  });

  it('should reject invalid manifest', () => {
    const manifest = { name: 'test' };

    const result = validateManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should validate plugin config', () => {
    const schema = {
      apiKey: { type: 'string' as const, required: true },
      maxRetries: { type: 'number' as const, default: 3 },
    };

    const config = { apiKey: 'secret-key', maxRetries: 5 };

    const result = validateConfig(config, schema);

    expect(result.valid).toBe(true);
  });

  it('should reject invalid config type', () => {
    const schema = {
      apiKey: { type: 'string' as const, required: true },
    };

    const config = { apiKey: 123 };

    const result = validateConfig(config, schema);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid type for apiKey');
  });

  it('should reject missing required config', () => {
    const schema = {
      apiKey: { type: 'string' as const, required: true },
    };

    const config = {};

    const result = validateConfig(config, schema);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Required config key missing: apiKey');
  });
});

describe('Plugin Registry', () => {
  beforeEach(() => {
    pluginRegistry.clear();
  });

  it('should register a plugin', () => {
    const plugin = createBuilder('test-plugin', '1.0.0')
      .lifecycle({})
      .build();

    pluginRegistry.register(plugin);

    expect(pluginRegistry.isInstalled('test-plugin')).toBe(true);
  });

  it('should get plugin by name', () => {
    const plugin = createBuilder('test-plugin', '1.0.0')
      .lifecycle({})
      .build();

    pluginRegistry.register(plugin);

    const retrieved = pluginRegistry.get('test-plugin');

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('test-plugin');
  });

  it('should get all plugins', () => {
    const plugin1 = createBuilder('plugin-1', '1.0.0').lifecycle({}).build();
    const plugin2 = createBuilder('plugin-2', '1.0.0').lifecycle({}).build();

    pluginRegistry.register(plugin1);
    pluginRegistry.register(plugin2);

    const all = pluginRegistry.getAll();

    expect(all).toHaveLength(2);
  });

  it('should get active plugins', () => {
    const plugin1 = createBuilder('plugin-1', '1.0.0').lifecycle({}).build();
    const plugin2 = createBuilder('plugin-2', '1.0.0').lifecycle({}).build();

    pluginRegistry.register(plugin1);
    pluginRegistry.register(plugin2);

    pluginRegistry.updateManifest('plugin-1', { enabled: true });
    pluginRegistry.updateManifest('plugin-2', { enabled: false });

    const active = pluginRegistry.getActive();

    expect(active).toHaveLength(1);
    expect(active[0].name).toBe('plugin-1');
  });

  it('should unregister a plugin', () => {
    const plugin = createBuilder('test-plugin', '1.0.0')
      .lifecycle({})
      .build();

    pluginRegistry.register(plugin);
    const unregistered = pluginRegistry.unregister('test-plugin');

    expect(unregistered).toBe(true);
    expect(pluginRegistry.isInstalled('test-plugin')).toBe(false);
  });

  it('should get plugins by capability', () => {
    const plugin1 = createBuilder('plugin-1', '1.0.0')
      .addRoute({ path: '/test', method: 'GET', handler: async () => new Response() })
      .lifecycle({})
      .build();

    const plugin2 = createBuilder('plugin-2', '1.0.0')
      .lifecycle({})
      .build();

    pluginRegistry.register(plugin1);
    pluginRegistry.register(plugin2);

    const withRoutes = pluginRegistry.getByCapability('routes');

    expect(withRoutes).toHaveLength(1);
    expect(withRoutes[0].name).toBe('plugin-1');
  });

  it('should check dependencies', () => {
    const plugin1 = createBuilder('plugin-1', '1.0.0').lifecycle({}).build();
    const plugin2 = createBuilder('plugin-2', '1.0.0')
      .dependencies('plugin-1')
      .lifecycle({})
      .build();

    pluginRegistry.register(plugin1);
    pluginRegistry.register(plugin2);

    const check = pluginRegistry.checkDependencies('plugin-2');

    expect(check.satisfied).toBe(true);
    expect(check.missing).toHaveLength(0);
  });

  it('should detect missing dependencies', () => {
    const plugin = createBuilder('test-plugin', '1.0.0')
      .dependencies('non-existent')
      .lifecycle({})
      .build();

    pluginRegistry.register(plugin);

    const check = pluginRegistry.checkDependencies('test-plugin');

    expect(check.satisfied).toBe(false);
    expect(check.missing).toContain('non-existent');
  });

  it('should get dependent plugins', () => {
    const plugin1 = createBuilder('plugin-1', '1.0.0').lifecycle({}).build();
    const plugin2 = createBuilder('plugin-2', '1.0.0')
      .dependencies('plugin-1')
      .lifecycle({})
      .build();

    pluginRegistry.register(plugin1);
    pluginRegistry.register(plugin2);

    const dependents = pluginRegistry.getDependents('plugin-1');

    expect(dependents).toHaveLength(1);
    expect(dependents[0].name).toBe('plugin-2');
  });
});

describe('Hook System', () => {
  beforeEach(() => {
    hookSystem.clear();
  });

  it('should register a hook handler', () => {
    const handler = async (data: any) => data;

    hookSystem.register('test:hook', handler, 0, 'test-plugin');

    expect(hookSystem.has('test:hook')).toBe(true);
  });

  it('should execute hook handlers in priority order', async () => {
    const results: number[] = [];

    hookSystem.register('test:hook', async (data: any) => {
      results.push(1);
      return data;
    }, 1, 'test-plugin');

    hookSystem.register('test:hook', async (data: any) => {
      results.push(2);
      return data;
    }, 10, 'test-plugin');

    hookSystem.register('test:hook', async (data: any) => {
      results.push(3);
      return data;
    }, 5, 'test-plugin');

    await hookSystem.execute('test:hook', 'test');

    expect(results).toEqual([2, 3, 1]);
  });

  it('should pass data through hook chain', async () => {
    hookSystem.register('test:hook', async (data: string) => data + ' world');
    hookSystem.register('test:hook', async (data: string) => data + ' hello');

    const result = await hookSystem.execute('test:hook', '');

    expect(result).toBe(' hello world');
  });

  it('should allow hook cancellation', async () => {
    hookSystem.register('test:hook', async (data: string) => {
      if (data === 'cancel') {
        return null as any;
      }
      return data;
    });

    const result = await hookSystem.execute('test:hook', 'cancel');

    expect(result).toBeNull();
  });

  it('should handle multiple handlers', async () => {
    let count = 0;

    hookSystem.register('test:hook', async () => { count++; });
    hookSystem.register('test:hook', async () => { count++; });
    hookSystem.register('test:hook', async () => { count++; });

    await hookSystem.execute('test:hook', null);

    expect(count).toBe(3);
  });

  it('should pass context to handlers', async () => {
    let receivedContext: any;

    hookSystem.register('test:hook', async (data, ctx) => {
      receivedContext = ctx;
      return data;
    });

    await hookSystem.execute('test:hook', null, { custom: 'value' });

    expect(receivedContext).toBeDefined();
    expect(receivedContext.custom).toBe('value');
  });

  it('should unregister all hooks for a plugin', () => {
    hookSystem.register('test:hook', async () => {}, 0, 'plugin-a');
    hookSystem.register('test:hook', async () => {}, 0, 'plugin-b');
    hookSystem.register('test:hook', async () => {}, 0, 'plugin-a');

    hookSystem.unregisterPlugin('plugin-a');

    const handlers = hookSystem.getHandlers('test:hook');

    expect(handlers).toHaveLength(1);
    expect(handlers[0].pluginName).toBe('plugin-b');
  });

  it('should get registered hooks', () => {
    hookSystem.register('hook-1', async () => {});
    hookSystem.register('hook-2', async () => {});
    hookSystem.register('hook-3', async () => {});

    const hooks = hookSystem.getRegisteredHooks();

    expect(hooks).toHaveLength(3);
    expect(hooks).toContain('hook-1');
    expect(hooks).toContain('hook-2');
    expect(hooks).toContain('hook-3');
  });
});

describe('Plugin Lifecycle', () => {
  beforeEach(async () => {
    await initializeDb();
    pluginRegistry.clear();
  });

  afterEach(async () => {
    await closeDb();
  });

  it('should install plugin with lifecycle', async () => {
    const plugin = createBuilder('test-plugin', '1.0.0')
      .lifecycle({
        async install(ctx) {
          logger.info('Installing test-plugin');
        },
      })
      .build();

    await installPlugin(plugin);

    expect(pluginRegistry.isInstalled('test-plugin')).toBe(true);
  });

  it('should activate plugin with lifecycle', async () => {
    const plugin = createBuilder('test-plugin', '1.0.0')
      .lifecycle({
        async activate(ctx) {
          logger.info('Activating test-plugin');
        },
      })
      .build();

    await installPlugin(plugin);
    await activatePlugin('test-plugin');

    expect(pluginRegistry.isActive('test-plugin')).toBe(true);
  });

  it('should deactivate plugin', async () => {
    const plugin = createBuilder('test-plugin', '1.0.0')
      .lifecycle({
        async deactivate(ctx) {
          logger.info('Deactivating test-plugin');
        },
      })
      .build();

    await installPlugin(plugin);
    await activatePlugin('test-plugin');
    await deactivatePlugin('test-plugin');

    expect(pluginRegistry.isActive('test-plugin')).toBe(false);
  });

  it('should uninstall plugin', async () => {
    const plugin = createBuilder('test-plugin', '1.0.0')
      .lifecycle({
        async uninstall(ctx) {
          logger.info('Uninstalling test-plugin');
        },
      })
      .build();

    await installPlugin(plugin);
    await uninstallPlugin('test-plugin');

    expect(pluginRegistry.isInstalled('test-plugin')).toBe(false);
  });

  it('should get plugin by name', async () => {
    const plugin = createBuilder('test-plugin', '1.0.0')
      .lifecycle({})
      .build();

    await installPlugin(plugin);

    const retrieved = getPlugin('test-plugin');

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('test-plugin');
  });

  it('should list all plugins', async () => {
    const plugin1 = createBuilder('plugin-1', '1.0.0').lifecycle({}).build();
    const plugin2 = createBuilder('plugin-2', '1.0.0').lifecycle({}).build();

    await installPlugin(plugin1);
    await installPlugin(plugin2);

    const all = listAllPlugins();

    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('should get active plugins', async () => {
    const plugin1 = createBuilder('plugin-1', '1.0.0').lifecycle({}).build();
    const plugin2 = createBuilder('plugin-2', '1.0.0').lifecycle({}).build();

    await installPlugin(plugin1);
    await installPlugin(plugin2);
    await activatePlugin('plugin-1');

    const active = getActivePlugins();

    expect(active).toHaveLength(1);
    expect(active[0].name).toBe('plugin-1');
  });

  it('should activate dependencies', async () => {
    const plugin1 = createBuilder('plugin-1', '1.0.0')
      .lifecycle({
        async activate(ctx) {
          logger.info('Activating plugin-1');
        },
      })
      .build();

    const plugin2 = createBuilder('plugin-2', '1.0.0')
      .dependencies('plugin-1')
      .lifecycle({
        async activate(ctx) {
          logger.info('Activating plugin-2');
        },
      })
      .build();

    await installPlugin(plugin1);
    await installPlugin(plugin2);
    await activatePlugin('plugin-2');

    expect(pluginRegistry.isActive('plugin-1')).toBe(true);
    expect(pluginRegistry.isActive('plugin-2')).toBe(true);
  });
});

describe('Plugin Builder SDK', () => {
  it('should build simple plugin', () => {
    const plugin = createBuilder('test-plugin', '1.0.0')
      .metadata({
        description: 'Test plugin',
        author: 'Test',
        license: 'MIT',
      })
      .lifecycle({})
      .build();

    expect(plugin.name).toBe('test-plugin');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.description).toBe('Test plugin');
    expect(plugin.author).toBe('Test');
    expect(plugin.license).toBe('MIT');
  });

  it('should add routes', () => {
    const plugin = createBuilder('test-plugin', '1.0.0')
      .addRoute({
        path: '/test',
        method: 'GET',
        handler: async () => new Response(),
      })
      .lifecycle({})
      .build();

    expect(plugin.routes).toBeDefined();
    expect(plugin.routes).toHaveLength(1);
    expect(plugin.routes![0].path).toBe('/test');
  });

  it('should add hooks', () => {
    const handler = async (data: any) => data;

    const plugin = createBuilder('test-plugin', '1.0.0')
      .addHook('test:hook', handler, 10)
      .lifecycle({})
      .build();

    expect(plugin.hooks).toBeDefined();
    expect(plugin.hooks).toHaveLength(1);
    expect(plugin.hooks![0].name).toBe('test:hook');
    expect(plugin.hooks![0].priority).toBe(10);
  });

  it('should add dependencies', () => {
    const plugin = createBuilder('test-plugin', '1.0.0')
      .dependencies('plugin-a', 'plugin-b')
      .lifecycle({})
      .build();

    expect(plugin.dependencies).toContain('plugin-a');
    expect(plugin.dependencies).toContain('plugin-b');
  });

  it('should add admin pages', () => {
    const plugin = createBuilder('test-plugin', '1.0.0')
      .addAdminPage({
        path: '/admin/test',
        title: 'Test Page',
        icon: 'TestIcon',
      })
      .lifecycle({})
      .build();

    expect(plugin.adminPages).toBeDefined();
    expect(plugin.adminPages).toHaveLength(1);
    expect(plugin.adminPages![0].title).toBe('Test Page');
  });
});
