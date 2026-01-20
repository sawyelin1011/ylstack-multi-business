# Core Database Schema Design

This document explains the core database schema designed for YLStack. All tables support multi-database compatibility (SQLite, PostgreSQL, D1, libSQL).

## Schema Overview

The core schema consists of 5 tables:

1. **users** - User accounts and authentication
2. **sessions** - Session management for authentication
3. **pages** - Content pages (CMS functionality)
4. **settings** - Key-value configuration storage
5. **plugin_data** - Plugin extension data storage

## Table Definitions

### 1. Users Table (`users`)

Stores user account information and authentication data.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER)),
  updated_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER))
);

CREATE INDEX idx_users_email ON users(email);
```

**Columns:**
- `id`: Unique user identifier (primary key)
- `email`: User's email address (unique, indexed)
- `name`: User's display name
- `password_hash`: BCrypt hashed password (from Better-Auth)
- `role`: User role (`'user'`, `'staff'`, `'admin'` - extensible)
- `created_at`: Timestamp when user was created
- `updated_at`: Timestamp when user was last modified

**Indexes:**
- `idx_users_email`: Speeds up email-based lookups (login, queries)

**Usage:**
- Authentication with Better-Auth
- User management in admin panel
- Author attribution for pages
- Access control based on roles

**Example Queries:**

```typescript
// Find user by email
const user = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, 'user@example.com'))
  .get();

// Update user role
await db
  .update(usersTable)
  .set({ role: 'admin' })
  .where(eq(usersTable.id, userId));
```

---

### 2. Sessions Table (`sessions`)

Manages user sessions for authentication (Better-Auth).

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER))
);
```

**Columns:**
- `id`: Session identifier (Better-Auth generates this)
- `user_id`: Foreign key to `users.id`
- `expires_at`: Unix timestamp when session expires
- `created_at`: When the session was created

**Relationships:**
- Foreign key to `users.id` with `ON DELETE CASCADE`
- When a user is deleted, all their sessions are automatically deleted

**Usage:**
- Better-Auth session management
- "Remember me" functionality
- Session invalidation on logout
- Automatic cleanup of expired sessions

**Example Queries:**

```typescript
// Get active session
const session = await db
  .select()
  .from(sessionsTable)
  .where(eq(sessionsTable.id, sessionId))
  .get();

// Clean up expired sessions
const now = Date.now();
await db
  .delete(sessionsTable)
  .where(lt(sessionsTable.expires_at, now));
```

---

### 3. Pages Table (`pages`)

Content management system for pages and posts.

```sql
CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  published INTEGER DEFAULT 0,
  author_id TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER)),
  updated_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER))
);

CREATE UNIQUE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_published ON pages(published);
```

**Columns:**
- `id`: Unique page identifier
- `slug`: URL-friendly identifier (unique, indexed)
- `title`: Page title
- `content`: Page content (Markdown/HTML/JSON based on plugin)
- `published`: Boolean flag (0 = draft, 1 = published)
- `author_id`: Foreign key to `users.id` (nullable)
- `created_at`: Creation timestamp
- `updated_at`: Last modification timestamp

**Indexes:**
- `idx_pages_slug`: Unique constraint and lookup by slug
- `idx_pages_published`: Filters published vs draft pages

**Usage:**
- plugin-pages: CMS functionality
- Blog posts, landing pages
- SEO-friendly URLs via slugs
- Draft workflow (published = false)

**Example Queries:**

```typescript
// Get published page by slug
const page = await db
  .select()
  .from(pagesTable)
  .where(and(eq(pagesTable.slug, 'about-us'), eq(pagesTable.published, true)))
  .get();

// List all published pages
const publishedPages = await db
  .select()
  .from(pagesTable)
  .where(eq(pagesTable.published, true))
  .orderBy(desc(pagesTable.created_at))
  .all();

// Create new page
const newPageId = nanoid();
await db.insert(pagesTable).values({
  id: newPageId,
  slug: 'my-new-page',
  title: 'My New Page',
  content: '# Hello World\n\nThis is my page.',
  published: false,
  author_id: currentUserId,
});
```

---

### 4. Settings Table (`settings`)

Key-value storage for application configuration.

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER))
);
```

**Columns:**
- `key`: Setting identifier (primary key)
- `value`: Setting value (JSON stringified for complex objects)
- `updated_at`: Last update timestamp

**Unique Characteristics:**
- Single-column primary key on `key`
- No auto-increment ID needed
- Values should be serialized JSON for complex types
- Acts like a persistent key-value store

**Usage:**
- App configuration
- Feature toggles
- Plugin settings
- Site metadata
- Cache storage

**Example Queries:**

```typescript
// Get setting
const setting = await db
  .select()
  .from(settingsTable)
  .where(eq(settingsTable.key, 'site_title'))
  .get();

const siteTitle = setting ? JSON.parse(setting.value) : 'My Site';

// Update setting
await db
  .update(settingsTable)
  .set({
    value: JSON.stringify('New Site Title'),
    updated_at: Date.now(),
  })
  .where(eq(settingsTable.key, 'site_title'));

// Upsert setting (insert or update)
await db.insert(settingsTable)
  .values({
    key: 'theme_color',
    value: JSON.stringify('#3B82F6'),
  })
  .onConflictDoUpdate({
    target: settingsTable.key,
    set: { value: JSON.stringify('#3B82F6') },
  });

// Get all settings
const allSettings = await db.select().from(settingsTable).all();
const settingsObj = Object.fromEntries(
  allSettings.map(s => [s.key, JSON.parse(s.value)])
);
```

---

### 5. Plugin Data Table (`plugin_data`)

Extensible storage for plugins to store their data, avoiding table-per-plugin.

```sql
CREATE TABLE plugin_data (
  plugin_id TEXT NOT NULL,
  data_key TEXT NOT NULL,
  data_value TEXT,
  created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER)),
  updated_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER)),
  PRIMARY KEY (plugin_id, data_key)
);

CREATE INDEX idx_plugin_data_plugin ON plugin_data(plugin_id);
```

**Columns:**
- `plugin_id`: Plugin identifier (e.g., `'plugin-payments'`)
- `data_key`: Data identifier within the plugin
- `data_value`: Data value (JSON serialized)
- `created_at`: Creation timestamp
- `updated_at`: Update timestamp

**Primary Key:** Composite key on `(plugin_id, data_key)`
- Ensures unique keys per plugin
- Allows plugins to manage their own key namespace

**Indexes:**
- `idx_plugin_data_plugin`: Query all data for a specific plugin

**Usage:**
- Plugin settings that don't fit in main settings table
- Plugin-specific data storage
- Plugin state persistence
- Avoids creating many plugin-specific tables
- Keeps plugin data isolated

**Example Queries:**

```typescript
// Store plugin data
await db.insert(pluginDataTable).values({
  plugin_id: 'plugin-payments',
  data_key: 'stripe_api_key',
  data_value: JSON.stringify('sk_live_...'),
});

// Get plugin data
const paymentKey = await db
  .select()
  .from(pluginDataTable)
  .where(and(
    eq(pluginDataTable.plugin_id, 'plugin-payments'),
    eq(pluginDataTable.data_key, 'stripe_api_key')
  ))
  .get();

// Get all data for a plugin
const allPaymentData = await db
  .select()
  .from(pluginDataTable)
  .where(eq(pluginDataTable.plugin_id, 'plugin-payments'))
  .all();

// Update plugin data
await db
  .update(pluginDataTable)
  .set({
    data_value: JSON.stringify('sk_test_...'),
    updated_at: Date.now(),
  })
  .where(and(
    eq(pluginDataTable.plugin_id, 'plugin-payments'),
    eq(pluginDataTable.data_key, 'stripe_api_key')
  ));

// Delete plugin data
await db
  .delete(pluginDataTable)
  .where(and(
    eq(pluginDataTable.plugin_id, 'plugin-payments'),
    eq(pluginDataTable.data_key, 'old_config')
  ));

// Get all plugin data as JSON object (useful for settings)
const pluginRows = await db
  .select()
  .from(pluginDataTable)
  .where(eq(pluginDataTable.plugin_id, 'plugin-payments'))
  .all();

const pluginConfig = Object.fromEntries(
  pluginRows.map(r => [r.data_key, JSON.parse(r.data_value)])
);
```

---

## Design Principles

### 1. Multi-Database Compatibility

All SQL uses **SQLite syntax** as the baseline, which is compatible with:
- ✅ SQLite (native)
- ✅ PostgreSQL (with Drizzle ORM translation)
- ✅ D1 (Cloudflare's SQLite-based database)
- ✅ libSQL (SQLite-compatible)

**Key decisions:**
- Use `INTEGER` for timestamps (Unix epoch milliseconds)
- Store booleans as `INTEGER` with mode: 'boolean'
- Use `TEXT` for all string fields (simpler across DBs)
- Use composite primary keys where appropriate

### 2. Type Safety

Full TypeScript type inference from Drizzle schema:

```typescript
// Types are auto-generated from schema
import type { User, NewUser, Page, NewPage } from '$lib/db/types';

const newUser: NewUser = {
  id: nanoid(),
  email: 'user@example.com',
  // TypeScript enforces required fields
};
```

### 3. Indexes for Performance

Strategic indexing for common query patterns:
- **Email lookups** (`idx_users_email`) - Login, user queries
- **Slug lookups** (`idx_pages_slug`) - Page routing
- **Published filter** (`idx_pages_published`) - Show published pages
- **Plugin queries** (`idx_plugin_data_plugin`) - Plugin data isolation

### 4. Relationships

Foreign keys with cascading deletes:
- Sessions → Users (delete sessions when user deleted)
- Pages → Users (keep pages if author deleted, optional FK)

### 5. Timestamps

**Created at:** Set once on insert, never changes
```sql
DEFAULT (CAST(unixepoch() AS INTEGER))
```

**Updated at:** On updates, manually set to current timestamp
```typescript
await db.update(table).set({
  ...updates,
  updated_at: Date.now(),
});
```

### 6. Extensibility

The schema is designed to be extended:

- **Adding columns:** Add to existing tables in future migrations
- **Plugin schemas:** Plugins create their own tables or use `plugin_data`
- **Settings:** Use `settings` table for configuration
- **Indexes:** Add as needed for new query patterns

### 7. Security

- Prepared statements by default (Drizzle ORM)
- Foreign key constraints maintain data integrity
- Indexed lookups prevent full table scans
- No sensitive data in schema (passwords are hashed)

## Data Flow Examples

### User Registration Flow

```typescript
1. Create user
   usersTable ← { id, email, name, password_hash, role }

2. Create session
   sessionsTable ← { id, user_id, expires_at }

3. Store session cookie
   Set-Cookie: session_id=...
```

### Page Creation Flow

```typescript
1. Create page draft
   pagesTable ← { id, slug, title, content, published: false }

2. User reviews, hits "Publish"
   UPDATE pages SET published = true WHERE id = 'page-id'

3. Page becomes publicly visible
   SELECT * FROM pages WHERE slug = 'my-page' AND published = true
```

### Plugin Configuration Flow

```typescript
1. Plugin installed (plugin-payments)
   plugin_data_table ← { 
     plugin_id: 'plugin-payments',
     data_key: 'enabled',
     data_value: 'true'
   }

2. Admin updates settings
   UPDATE plugin_data 
   SET data_value = 'false' 
   WHERE plugin_id = 'plugin-payments' 
   AND data_key = 'enabled'
```

## Migration Path

When schema changes are needed (Phase 4):

1. **Add columns:**
   ```sql
   ALTER TABLE users ADD COLUMN last_login_at INTEGER;
   ```

2. **New indexes:**
   ```sql
   CREATE INDEX idx_users_role ON users(role);
   ```

3. **New tables (for plugins):**
   ```sql
   CREATE TABLE plugin_analytics (
     id TEXT PRIMARY KEY,
     page_id TEXT REFERENCES pages(id),
     views INTEGER DEFAULT 0,
     created_at INTEGER NOT NULL
   );
   ```

4. **Backwards compatibility:**
   - New columns are nullable or have defaults
   - Existing code continues to work
   - Migrations are idempotent (safe to re-run)

## Query Optimization Tips

1. **Always use indexes:**
   ```typescript
   // Good: Uses index
   .where(eq(usersTable.email, email))
   
   // Bad: Full table scan
   .where(like(usersTable.email, `%${search}%`))
   ```

2. **Limit result sets:**
   ```typescript
   .limit(20)
   .offset(page * 20)
   ```

3. **Select only needed columns:**
   ```typescript
   .select({ 
     id: usersTable.id, 
     email: usersTable.email 
   })
   ```

4. **Use transactions for multiple operations:**
   ```typescript
   await db.transaction(async (tx) => {
     await tx.insert(usersTable).values(user);
     await tx.insert(settingsTable).values(settings);
   });
   ```

## Conclusion

This schema provides a solid foundation for YLStack:

✅ Clean separation of concerns
✅ Type-safe with TypeScript
✅ Multi-database compatible
✅ Indexed for performance
✅ Extensible for plugins
✅ Secure by design

The schema supports common CRUD operations while staying flexible for future features. Plugins can extend functionality without modifying core tables, and migrations will handle schema evolution gracefully.
