/**
 * Hello Plugin
 * Simple example plugin demonstrating routing and hooks
 */

import type { Plugin } from '../types';
import { createPlugin as createBuilder } from '../sdk/plugin-builder';

export const helloPlugin: Plugin = createBuilder('hello-plugin', '1.0.0')
  .metadata({
    description: 'A simple hello world plugin',
    author: 'YLStack',
    license: 'MIT',
  })
  .addRoute({
    path: '/api/hello',
    method: 'GET',
    handler: async (c) => {
      return c.json({
        message: 'Hello from hello-plugin!',
        timestamp: new Date().toISOString(),
      });
    },
  })
  .addRoute({
    path: '/api/hello/:name',
    method: 'GET',
    handler: async (c) => {
      const name = c.req.param('name');
      return c.json({
        message: `Hello, ${name}!`,
        timestamp: new Date().toISOString(),
      });
    },
  })
  .addHook('app:init', async () => {
    console.log('[hello-plugin] Initialized');
  })
  .addHook('app:ready', async () => {
    console.log('[hello-plugin] Ready to serve requests');
  })
  .lifecycle({
    async install(ctx) {
      ctx.logger.info('Installing hello-plugin');
    },
    async activate(ctx) {
      ctx.logger.info('Activating hello-plugin');
    },
    async deactivate(ctx) {
      ctx.logger.info('Deactivating hello-plugin');
    },
    async uninstall(ctx) {
      ctx.logger.info('Uninstalling hello-plugin');
    },
  })
  .build();

export default helloPlugin;
