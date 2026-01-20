import { sqliteSchema } from './schema';
import type { Database } from './client';

export type SeedTables = typeof sqliteSchema;

export type SeedData = Partial<{
  users: unknown[];
  sessions: unknown[];
  pages: unknown[];
  settings: unknown[];
  pluginData: unknown[];
}>;

export async function withTransaction<T>(database: Database, fn: (tx: any) => T | Promise<T>): Promise<T> {
  const dbAny = database as any;

  if (typeof dbAny.transaction !== 'function') {
    return await fn(database as any);
  }

  const isLikelySyncSqlite = !!dbAny?.$client && typeof dbAny.$client?.pragma === 'function';
  const isAsyncFn = fn.constructor?.name === 'AsyncFunction';

  if (isLikelySyncSqlite && isAsyncFn) {
    throw new Error('withTransaction: async callbacks are not supported with the synchronous SQLite driver (better-sqlite3)');
  }

  const result = dbAny.transaction(fn);
  return await result;
}

export async function bulkInsert(
  database: any,
  table: any,
  rows: unknown[],
  options: { chunkSize?: number } = {}
): Promise<void> {
  const chunkSize = options.chunkSize ?? 500;
  if (!rows.length) {
    return;
  }

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const query = database.insert(table).values(chunk as any);
    await executeQuery(query);
  }
}

export async function seedDatabase(
  database: any,
  seed: SeedData,
  tables: SeedTables = sqliteSchema
): Promise<void> {
  if (seed.users?.length) {
    await bulkInsert(database, tables.usersTable, seed.users);
  }

  if (seed.sessions?.length) {
    await bulkInsert(database, tables.sessionsTable, seed.sessions);
  }

  if (seed.pages?.length) {
    await bulkInsert(database, tables.pagesTable, seed.pages);
  }

  if (seed.settings?.length) {
    await bulkInsert(database, tables.settingsTable, seed.settings);
  }

  if (seed.pluginData?.length) {
    await bulkInsert(database, tables.pluginDataTable, seed.pluginData);
  }
}

async function executeQuery(query: any): Promise<any> {
  if (query && typeof query.execute === 'function') {
    return await query.execute();
  }

  if (query && typeof query.run === 'function') {
    return query.run();
  }

  if (query && typeof query.all === 'function') {
    return query.all();
  }

  if (query && typeof query.get === 'function') {
    return query.get();
  }

  return await query;
}
