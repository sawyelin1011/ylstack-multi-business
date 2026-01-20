import { usersTable, sessionsTable, pagesTable, settingsTable, pluginDataTable } from './schema';
export type { Database, DatabaseSchema } from './client';

export { usersTable, sessionsTable, pagesTable, settingsTable, pluginDataTable } from './schema';

// Table row types
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Session = typeof sessionsTable.$inferSelect;
export type NewSession = typeof sessionsTable.$inferInsert;

export type Page = typeof pagesTable.$inferSelect;
export type NewPage = typeof pagesTable.$inferInsert;

export type Setting = typeof settingsTable.$inferSelect;
export type NewSetting = typeof settingsTable.$inferInsert;

export type PluginData = typeof pluginDataTable.$inferSelect;
export type NewPluginData = typeof pluginDataTable.$inferInsert;
