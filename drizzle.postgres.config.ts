import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './packages/core/src/lib/db/schemas/postgresql.ts',
  out: './packages/core/drizzle/postgres',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/ylstack',
  },
});
