import { drizzle as drizzleSqlite, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleD1, type DrizzleD1Database } from 'drizzle-orm/d1';
import { drizzle as drizzleLibSQL, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { getDatabaseConfig } from '$lib/config';
import { usersTable, sessionsTable, pagesTable, settingsTable, pluginDataTable } from './schema';
import type { Env } from '../../types';

// Type for the complete database schema
type DatabaseSchema = {
  usersTable: typeof usersTable;
  sessionsTable: typeof sessionsTable;
  pagesTable: typeof pagesTable;
  settingsTable: typeof settingsTable;
  pluginDataTable: typeof pluginDataTable;
};

// Union type for all supported database instances
export type Database = 
  | BetterSQLite3Database<DatabaseSchema>
  | NodePgDatabase<DatabaseSchema>
  | DrizzleD1Database<DatabaseSchema>
  | LibSQLDatabase<DatabaseSchema>;

// Singleton database instance
let db: Database | null = null;

/**
 * Initialize the database connection based on the configured driver
 * @param env - Environment object (required for D1 driver with Cloudflare)
 * @returns Promise<Database> - Initialized database instance
 */
export async function initializeDb(env?: Env): Promise<Database> {
  if (db) {
    return db;
  }

  const config = getDatabaseConfig();

  try {
    switch (config.driver) {
      case 'sqlite': {
        const { default: Database } = await import('better-sqlite3');
        const sqliteInstance = new Database(config.url);
        
        // Enable WAL mode for better concurrent write performance
        sqliteInstance.pragma('journal_mode = WAL');
        
        db = drizzleSqlite(sqliteInstance, { 
          schema: {
            usersTable,
            sessionsTable,
            pagesTable,
            settingsTable,
            pluginDataTable,
          } 
        });
        
        console.log('✅ SQLite connected:', config.url);
        break;
      }

      case 'postgresql': {
        const { Pool } = await import('pg');
        const pool = new Pool({ 
          connectionString: config.url,
          max: config.poolSize,
          connectionTimeoutMillis: config.connectionTimeout,
        });
        
        db = drizzlePostgres(pool, { 
          schema: {
            usersTable,
            sessionsTable,
            pagesTable,
            settingsTable,
            pluginDataTable,
          } 
        });
        
        console.log('✅ PostgreSQL connected:', config.url.replace(/:\/\/[^:@]+:[^@]+@/, '://***:***@'));
        break;
      }

      case 'd1': {
        if (!env?.D1) {
          throw new Error('D1 binding not found in environment variables');
        }
        
        db = drizzleD1(env.D1, { 
          schema: {
            usersTable,
            sessionsTable,
            pagesTable,
            settingsTable,
            pluginDataTable,
          } 
        });
        
        console.log('✅ Cloudflare D1 connected');
        break;
      }

      case 'libsql': {
        const { createClient } = await import('@libsql/client');
        const client = createClient({ 
          url: config.url,
        });
        
        db = drizzleLibSQL(client, { 
          schema: {
            usersTable,
            sessionsTable,
            pagesTable,
            settingsTable,
            pluginDataTable,
          } 
        });
        
        console.log('✅ libSQL connected:', config.url);
        break;
      }

      default:
        throw new Error(`Unknown database driver: ${config.driver}`);
    }

    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw new Error(`Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the database instance
 * @returns Database - The initialized database instance
 * @throws Error if database not initialized
 */
export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDb() first in your application startup code.');
  }
  return db;
}

/**
 * Close all database connections gracefully
 */
export async function closeDb(): Promise<void> {
  if (!db) {
    return;
  }

  try {
    const config = getDatabaseConfig();
    
    // Close connections based on driver type
    switch (config.driver) {
      case 'sqlite': {
        // For SQLite/better-sqlite3, the connection is automatically managed
        console.log('Closing SQLite database connection...');
        break;
      }

      case 'postgresql': {
        // For PostgreSQL, we need to close the pool
        const dbAny = db as NodePgDatabase<DatabaseSchema>;
        if (dbAny.$client) {
          await dbAny.$client.end();
          console.log('PostgreSQL pool closed');
        }
        break;
      }

      case 'libsql': {
        // libSQL client cleanup
        const dbAny = db as LibSQLDatabase<DatabaseSchema>;
        console.log('libSQL connection closed');
        break;
      }

      case 'd1': {
        // D1 connections are managed by Cloudflare
        console.log('D1 connection closed (managed by Cloudflare)');
        break;
      }
    }

    db = null;
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
}
