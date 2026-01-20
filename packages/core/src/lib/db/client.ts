import { drizzle as drizzleSqlite, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleD1, type DrizzleD1Database } from 'drizzle-orm/d1';
import { drizzle as drizzleLibSQL, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { getDatabaseConfig } from '../config';
import { sqliteSchema } from './schema';
import { postgresSchema } from './schemas/postgresql';
import type { Env } from '../../types';
import { ensureSqliteFileDirectory, normalizeSqliteUrl } from './url';

export type SqliteDatabaseSchema = typeof sqliteSchema;
export type PostgresDatabaseSchema = typeof postgresSchema;
export type DatabaseSchema = SqliteDatabaseSchema | PostgresDatabaseSchema;

export type Database =
  | BetterSQLite3Database<SqliteDatabaseSchema>
  | NodePgDatabase<PostgresDatabaseSchema>
  | DrizzleD1Database<SqliteDatabaseSchema>
  | LibSQLDatabase<SqliteDatabaseSchema>;

let db: Database | null = null;
let dbClient: unknown = null;
let dbDriver: (ReturnType<typeof getDatabaseConfig>['driver']) | null = null;

/**
 * Initialize the database connection based on the configured driver.
 *
 * Notes:
 * - SQLite (better-sqlite3) is synchronous. Avoid async callbacks inside transactions.
 * - D1 requires an `env` binding.
 */
export async function initializeDb(env?: Env): Promise<Database> {
  if (db) {
    return db;
  }

  const config = getDatabaseConfig();
  dbDriver = config.driver;

  try {
    switch (config.driver) {
      case 'sqlite': {
        const { default: BetterSqlite3Database } = await import('better-sqlite3');
        const filename = normalizeSqliteUrl(config.url);
        ensureSqliteFileDirectory(filename);

        const sqliteInstance = new BetterSqlite3Database(filename);
        dbClient = sqliteInstance;

        sqliteInstance.pragma('journal_mode = WAL');

        db = drizzleSqlite(sqliteInstance, {
          schema: sqliteSchema,
        });

        console.log('✅ SQLite connected:', filename);
        break;
      }

      case 'postgresql': {
        const { Pool } = await import('pg');
        const pool = new Pool({
          connectionString: config.url,
          max: config.poolSize,
          connectionTimeoutMillis: config.connectionTimeout,
        });

        dbClient = pool;

        db = drizzlePostgres(pool, {
          schema: postgresSchema,
        });

        console.log(
          '✅ PostgreSQL connected:',
          config.url.replace(/:\/\/[^:@]+:[^@]+@/, '://***:***@')
        );
        break;
      }

      case 'd1': {
        if (!env?.D1) {
          throw new Error('D1 binding not found in environment variables');
        }

        dbClient = env.D1;

        db = drizzleD1(env.D1, {
          schema: sqliteSchema,
        });

        console.log('✅ Cloudflare D1 connected');
        break;
      }

      case 'libsql': {
        const { createClient } = await import('@libsql/client');
        const client = createClient({
          url: config.url,
        });

        dbClient = client;

        db = drizzleLibSQL(client, {
          schema: sqliteSchema,
        });

        console.log('✅ libSQL connected:', config.url);
        break;
      }

      default:
        throw new Error(`Unknown database driver: ${config.driver}`);
    }

    return db;
  } catch (error) {
    db = null;
    dbClient = null;
    dbDriver = null;

    console.error('❌ Database initialization failed:', error);
    throw new Error(
      `Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDb() first in your application startup code.');
  }
  return db;
}

export function getDbClient(): unknown {
  if (!db || !dbClient) {
    throw new Error('Database not initialized. Call initializeDb() first.');
  }
  return dbClient;
}

export async function closeDb(): Promise<void> {
  if (!db) {
    return;
  }

  try {
    switch (dbDriver) {
      case 'sqlite': {
        const clientAny = dbClient as any;
        if (clientAny && typeof clientAny.close === 'function') {
          clientAny.close();
        }
        break;
      }

      case 'postgresql': {
        const clientAny = dbClient as any;
        if (clientAny && typeof clientAny.end === 'function') {
          await clientAny.end();
        }
        break;
      }

      case 'libsql': {
        const clientAny = dbClient as any;
        if (clientAny && typeof clientAny.close === 'function') {
          await clientAny.close();
        }
        break;
      }

      case 'd1': {
        break;
      }

      default:
        break;
    }

    db = null;
    dbClient = null;
    dbDriver = null;
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
}
