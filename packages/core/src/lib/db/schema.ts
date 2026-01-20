import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  primaryKey,
  foreignKey,
  index,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table - stores user information
export const usersTable = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').unique().notNull(),
    name: text('name'),
    passwordHash: text('password_hash'),
    role: text('role').default('user'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`CAST(unixepoch() AS INTEGER)`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`CAST(unixepoch() AS INTEGER)`),
  },
  (table) => ({
    emailIdx: index('idx_users_email').on(table.email),
  })
);

// Sessions table - for Better-Auth authentication
export const sessionsTable = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CAST(unixepoch() AS INTEGER)`),
});

// Pages table - for plugin-pages functionality
export const pagesTable = sqliteTable(
  'pages',
  {
    id: text('id').primaryKey(),
    slug: text('slug').unique().notNull(),
    title: text('title').notNull(),
    content: text('content'),
    published: integer('published', { mode: 'boolean' }).default(false),
    authorId: text('author_id').references(() => usersTable.id),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`CAST(unixepoch() AS INTEGER)`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`CAST(unixepoch() AS INTEGER)`),
  },
  (table) => ({
    slugIdx: uniqueIndex('idx_pages_slug').on(table.slug),
    publishedIdx: index('idx_pages_published').on(table.published),
  })
);

// Settings table - key-value configuration storage
export const settingsTable = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CAST(unixepoch() AS INTEGER)`),
});

// Plugin data table - extensibility for plugins to store their data
export const pluginDataTable = sqliteTable(
  'plugin_data',
  {
    pluginId: text('plugin_id').notNull(),
    dataKey: text('data_key').notNull(),
    dataValue: text('data_value'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`CAST(unixepoch() AS INTEGER)`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`CAST(unixepoch() AS INTEGER)`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.pluginId, table.dataKey] }),
    pluginIdx: index('idx_plugin_data_plugin').on(table.pluginId),
  })
);

// Export all tables as a single schema object for easy import
export default {
  usersTable,
  sessionsTable,
  pagesTable,
  settingsTable,
  pluginDataTable,
};
