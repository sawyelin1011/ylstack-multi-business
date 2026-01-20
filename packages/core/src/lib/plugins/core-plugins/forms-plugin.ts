/**
 * Forms Plugin
 * Provides form builder and submission management
 */

import type { Plugin } from '../types';
import { createPlugin as createBuilder } from '../sdk/plugin-builder';

export const formsPlugin: Plugin = createBuilder('forms-plugin', '1.0.0')
  .metadata({
    description: 'Form builder and submission management',
    author: 'YLStack',
    license: 'MIT',
  })
  .addModel('forms', {
    id: 'string',
    name: 'string',
    slug: 'string',
    schema: 'json',
    active: 'boolean',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  })
  .addModel('formSubmissions', {
    id: 'string',
    formId: 'string',
    data: 'json',
    submittedAt: 'timestamp',
  })
  .addRoute({
    path: '/api/forms',
    method: 'GET',
    handler: async (c) => {
      const db = c.get('db');
      const { formsTable } = await import('../../db/schema');
      const { desc } = await import('drizzle-orm');

      const forms = await db
        .select()
        .from(formsTable)
        .orderBy(desc(formsTable.createdAt))
        .limit(50);

      return c.json({ data: forms });
    },
    auth: true,
  })
  .addRoute({
    path: '/api/forms/:slug',
    method: 'GET',
    handler: async (c) => {
      const slug = c.req.param('slug');
      const db = c.get('db');
      const { formsTable } = await import('../../db/schema');
      const { eq } = await import('drizzle-orm');

      const form = await db
        .select()
        .from(formsTable)
        .where(eq(formsTable.slug, slug))
        .get();

      if (!form) {
        return c.json({ error: 'Form not found' }, 404);
      }

      return c.json({ data: form });
    },
  })
  .addRoute({
    path: '/api/forms',
    method: 'POST',
    handler: async (c) => {
      const body = await c.req.json();
      const userId = c.get('userId');

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const db = c.get('db');
      const { formsTable } = await import('../../db/schema');
      const { v4 as uuidv4 } = await import('uuid');

      const now = Math.floor(Date.now() / 1000);

      const newForm = {
        id: uuidv4(),
        name: body.name,
        slug: body.slug,
        schema: body.schema,
        active: body.active ?? true,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(formsTable).values(newForm);

      return c.json({ data: newForm }, 201);
    },
    auth: true,
  })
  .addRoute({
    path: '/api/forms/:id/submissions',
    method: 'GET',
    handler: async (c) => {
      const formId = c.req.param('id');
      const userId = c.get('userId');

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const db = c.get('db');
      const { formSubmissionsTable } = await import('../../db/schema');
      const { eq, desc } = await import('drizzle-orm');

      const submissions = await db
        .select()
        .from(formSubmissionsTable)
        .where(eq(formSubmissionsTable.formId, formId))
        .orderBy(desc(formSubmissionsTable.submittedAt))
        .limit(100);

      return c.json({ data: submissions });
    },
    auth: true,
  })
  .addRoute({
    path: '/api/forms/:slug/submit',
    method: 'POST',
    handler: async (c) => {
      const slug = c.req.param('slug');
      const body = await c.req.json();

      const db = c.get('db');
      const { formsTable, formSubmissionsTable } = await import('../../db/schema');
      const { eq } = await import('drizzle-orm');
      const { v4 as uuidv4 } = await import('uuid');

      const form = await db
        .select()
        .from(formsTable)
        .where(eq(formsTable.slug, slug))
        .get();

      if (!form) {
        return c.json({ error: 'Form not found' }, 404);
      }

      if (!form.active) {
        return c.json({ error: 'Form is not active' }, 400);
      }

      const now = Math.floor(Date.now() / 1000);

      const submission = {
        id: uuidv4(),
        formId: form.id,
        data: body.data,
        submittedAt: now,
      };

      await db.insert(formSubmissionsTable).values(submission);

      return c.json({ data: submission, message: 'Form submitted successfully' }, 201);
    },
  })
  .addAdminPage({
    path: '/admin/forms',
    title: 'Forms',
    icon: 'Layout',
    permissions: ['content.read'],
  })
  .lifecycle({
    async install(ctx) {
      ctx.logger.info('Installing forms-plugin');
    },
    async activate(ctx) {
      ctx.logger.info('Activating forms-plugin');
    },
    async deactivate(ctx) {
      ctx.logger.info('Deactivating forms-plugin');
    },
    async uninstall(ctx) {
      ctx.logger.info('Uninstalling forms-plugin');
    },
  })
  .build();

export default formsPlugin;
