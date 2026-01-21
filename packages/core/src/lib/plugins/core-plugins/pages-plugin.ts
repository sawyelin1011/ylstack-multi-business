/**
 * Pages Plugin
 * Provides content page management with models, routes, and admin UI
 */

import type { Plugin } from '../types';
import { createPlugin as createBuilder } from '../sdk/plugin-builder';

export const pagesPlugin: Plugin = createBuilder('pages-plugin', '1.0.0')
  .metadata({
    description: 'Content page management system',
    author: 'YLStack',
    license: 'MIT',
  })
  .addModel('pages', {
    id: 'string',
    slug: 'string',
    title: 'string',
    content: 'text',
    published: 'boolean',
    authorId: 'string',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  })
  .addRoute({
    path: '/api/pages',
    method: 'GET',
    handler: async (c) => {
      const { getDb } = await import('../../db');
      const { pagesTable } = await import('../../db/schema');
      const { desc } = await import('drizzle-orm');

      const db = getDb();
      const pages = await db
        .select()
        .from(pagesTable)
        .orderBy(desc(pagesTable.createdAt))
        .limit(50);

      return c.json({ data: pages });
    },
  })
  .addRoute({
    path: '/api/pages/:slug',
    method: 'GET',
    handler: async (c) => {
      const slug = c.req.param('slug');
      const { getDb } = await import('../../db');
      const { pagesTable } = await import('../../db/schema');
      const { eq } = await import('drizzle-orm');

      const db = getDb();
      const page = await db
        .select()
        .from(pagesTable)
        .where(eq(pagesTable.slug, slug))
        .get();

      if (!page) {
        return c.json({ error: 'Page not found' }, 404);
      }

      return c.json({ data: page });
    },
  })
  .addRoute({
    path: '/api/pages',
    method: 'POST',
    handler: async (c) => {
      const body = await c.req.json();
      const userId = c.get('userId');

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const { getDb } = await import('../../db');
      const { pagesTable } = await import('../../db/schema');
      const { v4 as uuidv4 } = await import('uuid');

      const db = getDb();
      const now = Math.floor(Date.now() / 1000);

      const newPage = {
        id: uuidv4(),
        slug: body.slug,
        title: body.title,
        content: body.content || '',
        published: body.published || false,
        authorId: userId,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(pagesTable).values(newPage);

      return c.json({ data: newPage }, 201);
    },
    auth: true,
  })
  .addRoute({
    path: '/api/pages/:id',
    method: 'PUT',
    handler: async (c) => {
      const id = c.req.param('id');
      const body = await c.req.json();
      const userId = c.get('userId');

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const { getDb } = await import('../../db');
      const { pagesTable } = await import('../../db/schema');
      const { eq } = await import('drizzle-orm');

      const db = getDb();

      const updateData: any = {
        updatedAt: Math.floor(Date.now() / 1000),
      };

      if (body.title !== undefined) updateData.title = body.title;
      if (body.content !== undefined) updateData.content = body.content;
      if (body.published !== undefined) updateData.published = body.published;

      await db
        .update(pagesTable)
        .set(updateData)
        .where(eq(pagesTable.id, id));

      const updated = await db
        .select()
        .from(pagesTable)
        .where(eq(pagesTable.id, id))
        .get();

      return c.json({ data: updated });
    },
    auth: true,
  })
  .addRoute({
    path: '/api/pages/:id',
    method: 'DELETE',
    handler: async (c) => {
      const id = c.req.param('id');
      const userId = c.get('userId');

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const { getDb } = await import('../../db');
      const { pagesTable } = await import('../../db/schema');
      const { eq } = await import('drizzle-orm');

      const db = getDb();
      await db.delete(pagesTable).where(eq(pagesTable.id, id));

      return c.json({ message: 'Page deleted' });
    },
    auth: true,
  })
  .addAdminPage({
    path: '/admin/pages',
    title: 'Pages',
    icon: 'FileText',
    permissions: ['content.read'],
  })
  .addHook('content:create', async (data) => {
    console.log('[pages-plugin] Content created:', data);
  })
  .addHook('content:update', async (data) => {
    console.log('[pages-plugin] Content updated:', data);
  })
  .addHook('content:delete', async (data) => {
    console.log('[pages-plugin] Content deleted:', data);
  })
  .lifecycle({
    async install(ctx) {
      ctx.logger.info('Installing pages-plugin');
    },
    async activate(ctx) {
      ctx.logger.info('Activating pages-plugin');
    },
    async deactivate(ctx) {
      ctx.logger.info('Deactivating pages-plugin');
    },
    async uninstall(ctx) {
      ctx.logger.info('Uninstalling pages-plugin');
    },
  })
  .build();

export default pagesPlugin;
