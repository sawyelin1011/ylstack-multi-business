import {
  pgTable,
  text,
  integer,
  uniqueIndex,
  primaryKey,
  foreignKey,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users table - stores user information
export const usersTable = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name'),
  passwordHash: text('password_hash'),
  role: text('role').default('user'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`extract(epoch from now())::int`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`extract(epoch from now())::int`),
}, (table) => [
  index('idx_users_email').on(table.email),
]);

// Sessions table - for Better-Auth authentication
export const sessionsTable = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`extract(epoch from now())::int`),
});

// Pages table - for plugin-pages functionality
export const pagesTable = pgTable('pages', {
  id: text('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  title: text('title').notNull(),
  content: text('content'),
  published: integer('published').default(0),
  authorId: text('author_id').references(() => usersTable.id),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`extract(epoch from now())::int`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`extract(epoch from now())::int`),
}, (table) => [
  uniqueIndex('idx_pages_slug').on(table.slug),
  index('idx_pages_published').on(table.published),
]);

// Settings table - key-value configuration storage
export const settingsTable = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`extract(epoch from now())::int`),
});

// Plugin data table - extensibility for plugins to store their data
export const pluginDataTable = pgTable('plugin_data', {
  pluginId: text('plugin_id').notNull(),
  dataKey: text('data_key').notNull(),
  dataValue: text('data_value'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`extract(epoch from now())::int`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`extract(epoch from now())::int`),
}, (table) => [
  primaryKey({ columns: [table.pluginId, table.dataKey] }),
  index('idx_plugin_data_plugin').on(table.pluginId),
]);

// Export all tables as a single schema object for easy import
export default {
  usersTable,
  sessionsTable,
  pagesTable,
  settingsTable,
  pluginDataTable,
};