# Database Setup Guide

This guide explains how to set up and use the YLStack multi-database abstraction layer.

## Overview

YLStack supports multiple database drivers with a single codebase:
- **SQLite** (default) - Local file-based database
- **PostgreSQL** - Production-ready relational database
- **D1** - Cloudflare's edge database for Workers
- **libSQL** - Turso's edge-compatible fork of SQLite

## Configuration

### Environment Variables

Configure your database using environment variables or `config.yaml`:

```bash
# SQLite (default)
DATABASE_DRIVER=sqlite
DATABASE_URL=file:./data/app.db

# PostgreSQL
DATABASE_DRIVER=postgresql
DATABASE_URL=postgresql://user:password@localhost:5432/ylstack

# D1 (Cloudflare Workers)
DATABASE_DRIVER=d1
# Uses the D1 binding from your Cloudflare environment

# libSQL (Turso)
DATABASE_DRIVER=libsql
DATABASE_URL=https://your-database.turso.io
LIBSQL_AUTH_TOKEN=your-auth-token
```

Or configure via `config.yaml`:

```yaml
database:
  driver: "sqlite"  # Options: sqlite | postgresql | d1 | libsql
  url: "file:./data/app.db"
  poolSize: 10  # Only used for PostgreSQL
  connectionTimeout: 30000  # Only used for PostgreSQL
```

## Setting Up Different Databases

### SQLite (Default)

SQLite is the default database and requires no additional setup:

```bash
# The database file will be created automatically
DATABASE_DRIVER=sqlite
DATABASE_URL=file:./data/app.db
```

**Note**: For production use with SQLite, ensure the `data` directory is backed up and has proper file permissions.

### PostgreSQL

1. **Install PostgreSQL** (if not already installed):
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Create the database**:
   ```bash
   # Start PostgreSQL service
   sudo service postgresql start
   
   # Switch to postgres user
   sudo -i -u postgres
   
   # Create database
   createdb ylstack
   
   # (Optional) Create user
   createuser --interactive
   ```

3. **Configure connection**:
   ```bash
   DATABASE_DRIVER=postgresql
   DATABASE_URL=postgresql://username:password@localhost:5432/ylstack
   ```

### Cloudflare D1

1. **Install Wrangler** (Cloudflare CLI):
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Create a D1 database**:
   ```bash
   wrangler d1 create ylstack-db
   ```

3. **Configure `wrangler.toml`**:
   ```toml
   [[d1_databases]]
   binding = "D1"
   database_name = "ylstack-db"
   database_id = "your-database-id"
   
   # For preview deployments
   [[d1_databases]]
   binding = "D1"
   database_name = "ylstack-db-preview"
   database_id = "your-preview-database-id"
   preview_database_id = "your-preview-database-id"
   ```

4. **Deploy**:
   ```bash
   wrangler deploy
   ```

5. **Local development**:
   - Use SQLite locally for development
   - D1 is only available when deployed to Cloudflare
   - Configure different drivers for dev vs prod:
     ```yaml
     # config.yaml (local development)
     database:
       driver: "sqlite"
     
     # Production uses D1 via environment/config
     ```

### libSQL (Turso)

1. **Install Turso CLI**:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. **Login and create database**:
   ```bash
   turso auth login
   turso db create ylstack
   ```

3. **Get database URL and token**:
   ```bash
   turso db show ylstack --url
   turso db tokens create ylstack
   ```

4. **Configure**:
   ```bash
   DATABASE_DRIVER=libsql
   DATABASE_URL=your-database-url
   DATABASE_AUTH_TOKEN=your-auth-token
   ```

## Initialization

The database is automatically initialized when you call `initializeDb()`:

```typescript
import { initializeDb } from '$lib/db';

// For non-D1 databases
const db = await initializeDb();

// For D1 with Cloudflare Workers
const db = await initializeDb(env);
```

Example in SvelteKit `hooks.server.ts`:

```typescript
import { initializeDb, closeDb } from '$lib/db';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  try {
    // Initialize database
    await initializeDb(env);
    
    const response = await resolve(event);
    return response;
  } finally {
    // Cleanup after request
    await closeDb();
  }
};
```

## Usage Examples

### Querying Data

```typescript
import { getDb } from '$lib/db';
import { usersTable } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

// Get a single user
const user = await getDb()
  .select()
  .from(usersTable)
  .where(eq(usersTable.id, 'user-id'))
  .get();

// Get all users (with limit)
const users = await getDb()
  .select()
  .from(usersTable)
  .limit(20)
  .all();
```

### Inserting Data

```typescript
import { getDb, usersTable } from '$lib/db';
import { nanoid } from 'nanoid';

const newUserId = nanoid();
await getDb().insert(usersTable).values({
  id: newUserId,
  email: 'user@example.com',
  name: 'John Doe',
});
```

### Updating Data

```typescript
import { getDb, usersTable } from '$lib/db';
import { eq } from 'drizzle-orm';

await getDb()
  .update(usersTable)
  .set({
    name: 'Jane Doe',
    updatedAt: Date.now(),
  })
  .where(eq(usersTable.id, 'user-id'));
```

### Deleting Data

```typescript
import { getDb, usersTable } from '$lib/db';
import { eq } from 'drizzle-orm';

await getDb()
  .delete(usersTable)
  .where(eq(usersTable.id, 'user-id'));
```

## Performance Tuning

### PostgreSQL Connection Pooling

For PostgreSQL, connection pool settings can be tuned based on your workload:

```yaml
database:
  driver: "postgresql"
  url: "postgresql://..."
  poolSize: 20           # Increase for high-traffic servers
  connectionTimeout: 30000  # 30 seconds
```

- **poolSize**: Number of connections in the pool
  - Development: 5-10
  - Small production: 10-20
  - High-traffic production: 50-100
- **connectionTimeout**: Time to wait for a connection (ms)

### SQLite Performance

SQLite automatically uses WAL (Write-Ahead Logging) for better concurrent write performance. To optimize further:

1. Store database on fast SSD storage
2. Use appropriate page size (default is usually fine)
3. Run `VACUUM` periodically for maintenance

### D1 Performance

D1 performance depends on:
- Geographic region (choose closest to users)
- Query patterns (minimize round trips)
- Use Cloudflare's caching where possible

See [D1 best practices](https://developers.cloudflare.com/d1/best-practices/).

## Troubleshooting

### Connection Errors

**PostgreSQL**: Check if the service is running and credentials are correct
```bash
psql -h localhost -U postgres -d ylstack
```

**SQLite**: Ensure the directory exists and has write permissions
```bash
mkdir -p ./data
chmod 755 ./data
```

**libSQL**: Verify URL and auth token
```bash
curl -H "Authorization: Bearer TOKEN" URL
```

**D1**: Check wrangler.toml and deployment status
```bash
wrangler d1 list
wrangler d1 info ylstack-db
```

### Migration Issues

If you encounter schema issues:

1. **Backup your data** first
2. **Reset migrations**:
   ```bash
   # For SQLite (remove database file)
   rm ./data/app.db
   
   # For PostgreSQL (drop and recreate)
   dropdb ylstack && createdb ylstack
   
   # For D1 (delete and recreate)
   wrangler d1 delete ylstack-db
   wrangler d1 create ylstack-db
   ```

3. **Re-run migrations** (when available in Phase 4)

### Type Errors

If TypeScript shows errors:

1. Ensure you're using the correct table types
2. Import types from `$lib/db/types`:
   ```typescript
   import type { User, NewUser } from '$lib/db/types';
   ```

## Database-Specific Features

### SQLite Features

- **File-based**: Simple backup by copying the `.db` file
- **Single-user**: Best for development or single-server deployments
- **Embedded**: No separate process needed
- **Constraints**: Foreign keys are enforced, use `PRAGMA foreign_keys=ON`

### PostgreSQL Features

- **Full-text search**: Built-in search capabilities
- **Advanced indexes**: GIN, BRIN, partial indexes
- **JSON support**: `jsonb` type for flexible data
- **Extensions**: PostGIS, pg_cron, etc.
- **Scalability**: Vertical and horizontal scaling

### D1 Features

- **Global distribution**: Deploys to Cloudflare's edge network
- **Instant reads**: Low latency from CDNs
- **Workers integration**: Seamless with Cloudflare Workers
- **Limitations**: No transactions across workers, 100MB max database size

### libSQL Features

- **SQLite compatible**: Works with existing SQLite tools
- **Edge optimized**: Designed for edge computing
- **Sync**: Can sync with remote Turso databases
- **HTTP API**: HTTP-based queries for serverless

## Supported Data Types

The schema uses SQLite-compatible types that work across all drivers:

| Type | Description | Example |
|------|-------------|---------|
| `text` | String/text data | `'hello'` |
| `integer` | Integer numbers | `42` |
| `integer({ mode: 'boolean' })` | Boolean | `true`/`false` |
| `real` | Floating point | `3.14` |
| `blob` | Binary data | `Buffer.from('data')` |

## Development Workflow

### Local Development

1. Use **SQLite** for local development (fast, simple)
2. Keep database file in `.gitignore`:
   ```
   # .gitignore
   *.db
   data/
   ```

### Testing Different Databases

1. **Test with all databases** before production:
   ```bash
   # Test SQLite
   DATABASE_DRIVER=sqlite bun run dev
   
   # Test PostgreSQL (if available)
   DATABASE_DRIVER=postgresql DATABASE_URL="postgresql://..." bun run dev
   
   # Test libSQL (if available)
   DATABASE_DRIVER=libsql DATABASE_URL="..." bun run dev
   ```

2. **Use environment-specific config**:
   ```yaml
   # config.local.yaml (gitignored)
   database:
     driver: "postgresql"
     url: "postgresql://localhost/test_db"
   ```

## Security Best Practices

1. **Never commit database files** - Add to `.gitignore`
2. **Use connection strings from environment** - Don't hardcode credentials
3. **Use prepared statements** - All Drizzle queries are safe by default
4. **Limit pool sizes** - Prevent resource exhaustion
5. **Use SSL for remote databases** - Particularly for PostgreSQL over internet
6. **Regular backups** - Automated backups for production
7. **Access controls** - Restrict database access per environment

## Migration Strategy (Coming in Phase 4)

Automated migration system will:
- Generate migrations from schema changes
- Support multiple database drivers
- Handle plugin schema extensions
- Provide rollback capability
- Validate migrations before applying

Stay tuned for Phase 4: Database Migrations!
