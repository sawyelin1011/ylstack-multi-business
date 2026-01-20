import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './packages/core/src/lib/db/schema.ts',
  out: './packages/core/drizzle/sqlite',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:./data/app.db',
  },
});
