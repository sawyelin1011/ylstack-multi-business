import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  primaryKey,
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
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CAST(unixepoch() AS INTEGER)`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CAST(unixepoch() AS INTEGER)`),
});

// Refresh tokens table - for JWT refresh tokens
export const refreshTokensTable = sqliteTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey(),
    token: text('token').unique().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at').notNull(),
    revoked: integer('revoked', { mode: 'boolean' }).default(false),
    revokedAt: integer('revoked_at'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`CAST(unixepoch() AS INTEGER)`),
  },
  (table) => ({
    tokenIdx: uniqueIndex('idx_refresh_tokens_token').on(table.token),
    userIdIdx: index('idx_refresh_tokens_user').on(table.userId),
  })
);

// Auth events table - audit log for authentication events
export const authEventsTable = sqliteTable(
  'auth_events',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => usersTable.id, { onDelete: 'set null' }),
    eventType: text('event_type').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    details: text('details'),
    success: integer('success', { mode: 'boolean' }).notNull(),
    errorMessage: text('error_message'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`CAST(unixepoch() AS INTEGER)`),
  },
  (table) => ({
    userIdIdx: index('idx_auth_events_user').on(table.userId),
    eventTypeIdx: index('idx_auth_events_type').on(table.eventType),
    createdAtIdx: index('idx_auth_events_created').on(table.createdAt),
  })
);

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

// Plugins table - tracks installed plugins and their state
export const pluginsTable = sqliteTable(
  'plugins',
  {
    id: text('id').primaryKey(),
    name: text('name').unique().notNull(),
    version: text('version').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).default(true),
    config: text('config'),
    installedAt: integer('installed_at')
      .notNull()
      .default(sql`CAST(unixepoch() AS INTEGER)`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`CAST(unixepoch() AS INTEGER)`),
  },
  (table) => ({
    nameIdx: uniqueIndex('idx_plugins_name').on(table.name),
    enabledIdx: index('idx_plugins_enabled').on(table.enabled),
  })
);

// Forms table - for form-builder plugin
export const formsTable = sqliteTable(
  'forms',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').unique().notNull(),
    schema: text('schema').notNull(),
    active: integer('active', { mode: 'boolean' }).default(true),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`CAST(unixepoch() AS INTEGER)`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`CAST(unixepoch() AS INTEGER)`),
  },
  (table) => ({
    slugIdx: uniqueIndex('idx_forms_slug').on(table.slug),
    activeIdx: index('idx_forms_active').on(table.active),
  })
);

// Form submissions table
export const formSubmissionsTable = sqliteTable(
  'form_submissions',
  {
    id: text('id').primaryKey(),
    formId: text('form_id')
      .notNull()
      .references(() => formsTable.id, { onDelete: 'cascade' }),
    data: text('data').notNull(),
    submittedAt: integer('submitted_at')
      .notNull()
      .default(sql`CAST(unixepoch() AS INTEGER)`),
  },
  (table) => ({
    formIdIdx: index('idx_form_submissions_form').on(table.formId),
  })
);

export const sqliteSchema = {
  usersTable,
  sessionsTable,
  refreshTokensTable,
  authEventsTable,
  pagesTable,
  settingsTable,
  pluginDataTable,
  pluginsTable,
  formsTable,
  formSubmissionsTable,
} as const;

export default sqliteSchema;
