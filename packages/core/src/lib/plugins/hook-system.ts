/**
 * Plugin Hook System
 * Allows plugins to register and execute lifecycle hooks
 */

import { createLogger } from '../logger';
import type { HookHandler, HookContext, StandardHookName } from './types';
import { HookExecutionError } from '../auth/errors';

const logger = createLogger({ module: 'HookSystem' });

interface HookRegistration {
  pluginName: string;
  handler: HookHandler;
  priority: number;
}

class HookSystem {
  private hooks: Map<string, HookRegistration[]> = new Map();

  /**
   * Register a hook handler
   */
  register(
    name: string,
    handler: HookHandler,
    priority: number = 0,
    pluginName: string = 'core'
  ): void {
    logger.debug('Registering hook', { name, pluginName, priority });

    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }

    const handlers = this.hooks.get(name)!;
    handlers.push({ pluginName, handler, priority });

    handlers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Unregister a hook handler
   */
  unregister(name: string, handler: HookHandler): void {
    logger.debug('Unregistering hook', { name });

    const handlers = this.hooks.get(name);

    if (!handlers) {
      return;
    }

    const index = handlers.findIndex(h => h.handler === handler);

    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Unregister all hooks for a plugin
   */
  unregisterPlugin(pluginName: string): void {
    logger.info('Unregistering all hooks for plugin', { pluginName });

    for (const [hookName, handlers] of this.hooks.entries()) {
      const filtered = handlers.filter(h => h.pluginName !== pluginName);

      if (filtered.length === 0) {
        this.hooks.delete(hookName);
      } else {
        this.hooks.set(hookName, filtered);
      }
    }
  }

  /**
   * Execute all handlers for a hook
   */
  async execute<T = any, R = any>(
    name: string,
    data: T,
    context: Partial<HookContext> = {}
  ): Promise<R | T> {
    const handlers = this.hooks.get(name);

    if (!handlers || handlers.length === 0) {
      return data as R;
    }

    logger.debug('Executing hook', { name, handlerCount: handlers.length });

    let result: R | T = data;

    for (const registration of handlers) {
      try {
        const hookContext: HookContext = {
          pluginName: registration.pluginName,
          timestamp: Date.now(),
          ...context,
        };

        const handlerResult = await registration.handler(result, hookContext);

        if (handlerResult !== undefined) {
          result = handlerResult;
        }
      } catch (error) {
        logger.error('Hook handler error', {
          hookName: name,
          pluginName: registration.pluginName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        throw new HookExecutionError(name, error as Error);
      }
    }

    return result;
  }

  /**
   * Check if a hook has registered handlers
   */
  has(name: string): boolean {
    const handlers = this.hooks.get(name);
    return handlers !== undefined && handlers.length > 0;
  }

  /**
   * Get all registered hook names
   */
  getRegisteredHooks(): string[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Get handlers for a specific hook
   */
  getHandlers(name: string): HookRegistration[] {
    return this.hooks.get(name) || [];
  }

  /**
   * Clear all hooks (useful for testing)
   */
  clear(): void {
    this.hooks.clear();
  }
}

const hookSystem = new HookSystem();

export { hookSystem, HookSystem };
export default hookSystem;
