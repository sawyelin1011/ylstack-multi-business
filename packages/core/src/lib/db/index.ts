// Public API for the database layer
export { initializeDb, getDb, closeDb } from './client';
export type { Database, DatabaseSchema } from './client';

// Export schema tables
export { usersTable, sessionsTable, pagesTable, settingsTable, pluginDataTable } from './schema';
export { default as schema } from './schema';

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
