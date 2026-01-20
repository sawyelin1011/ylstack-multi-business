// Public API for the database layer
export { initializeDb, getDb, closeDb, getDbClient } from './client';
export type { Database, DatabaseSchema } from './client';

// Export schemas
export { sqliteSchema, usersTable, sessionsTable, pagesTable, settingsTable, pluginDataTable } from './schema';
export { postgresSchema } from './schemas/postgresql';
export { default as schema } from './schema';

// Utilities
export { normalizeSqliteUrl, ensureSqliteFileDirectory } from './url';
export { withTransaction, bulkInsert, seedDatabase } from './utils';

// Export types
export type {
  User,
  NewUser,
  Session,
  NewSession,
  Page,
  NewPage,
  Setting,
  NewSetting,
  PluginData,
  NewPluginData,
} from './types';

// Export helper types from Drizzle
export type { 
  InferSelectModel, 
  InferInsertModel 
} from 'drizzle-orm';

// Re-export Drizzle ORM operators commonly used
export { 
  eq, 
  ne, 
  lt, 
  lte, 
  gt, 
  gte, 
  inArray, 
  notInArray, 
  isNull, 
  isNotNull, 
  like, 
  notLike,
  and,
  or,
  between,
  desc,
  asc,
  count,
  sum,
  avg,
  max,
  min,
} from 'drizzle-orm';
