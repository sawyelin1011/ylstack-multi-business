import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { reloadConfig } from '../../config';
import {
  initializeDb,
  getDb,
  closeDb,
  getDbClient,
  normalizeSqliteUrl,
  bulkInsert,
  seedDatabase,
  withTransaction,
  usersTable,
  pagesTable,
  settingsTable,
} from '../index';

describe('Database Layer', () => {
  let tempDir: string;
  let dbFile: string;

  beforeEach(async () => {
    await closeDb();

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ylstack-db-test-'));
    dbFile = path.join(tempDir, 'test.db');

    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.DATABASE_DRIVER = 'sqlite';
    process.env.DATABASE_URL = `file:${dbFile}`;

    reloadConfig();
  });

  afterEach(async () => {
    await closeDb();
    fs.rmSync(tempDir, { recursive: true, force: true });

    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_DRIVER;
    delete process.env.JWT_SECRET;
  });

  it('normalizes sqlite file URLs', () => {
    expect(normalizeSqliteUrl('file:./data/app.db')).toBe('./data/app.db');
    expect(normalizeSqliteUrl('file:///tmp/app.db?mode=rwc')).toBe('/tmp/app.db');
    expect(normalizeSqliteUrl('./data/app.db')).toBe('./data/app.db');
  });

  it('getDb throws before initialization', () => {
    expect(() => getDb()).toThrow('Database not initialized');
  });

  it('initializeDb returns an instance and getDb returns the same instance', async () => {
    const db = await initializeDb();
    expect(db).toBeDefined();
    expect(getDb()).toBe(db);
  });

  it('initializeDb is a singleton (same instance returned)', async () => {
    const db1 = await initializeDb();
    const db2 = await initializeDb();
    expect(db1).toBe(db2);
  });

  it('getDbClient exposes the raw client for the active driver', async () => {
    await initializeDb();
    const raw = getDbClient() as any;
    expect(raw).toBeDefined();
    expect(typeof raw.exec).toBe('function');
  });

  it('creates missing sqlite directory when pointing at nested paths', async () => {
    await closeDb();

    const nestedDir = path.join(tempDir, 'nested', 'dir');
    const nestedFile = path.join(nestedDir, 'nested.db');

    process.env.DATABASE_URL = `file:${nestedFile}`;
    reloadConfig();

    await initializeDb();

    expect(fs.existsSync(nestedDir)).toBe(true);
  });

  it('bulkInsert inserts multiple rows', async () => {
    await initializeDb();
    const db = getDb() as any;
    const client = getDbClient() as any;

    bootstrapSqliteSchema(client);

    await bulkInsert(db, usersTable, [
      { id: 'u1', email: 'u1@example.com' },
      { id: 'u2', email: 'u2@example.com' },
      { id: 'u3', email: 'u3@example.com' },
    ]);

    const row = client.prepare('select count(*) as cnt from users').get();
    expect(row.cnt).toBe(3);
  });

  it('seedDatabase can seed multiple tables', async () => {
    await initializeDb();
    const db = getDb() as any;
    const client = getDbClient() as any;

    bootstrapSqliteSchema(client);

    await seedDatabase(db, {
      users: [{ id: 'admin', email: 'admin@example.com', role: 'admin' }],
      pages: [{ id: 'p1', slug: 'home', title: 'Home', published: true, authorId: 'admin' }],
      settings: [{ key: 'site.title', value: 'YLStack' }],
    });

    expect(client.prepare('select count(*) as cnt from users').get().cnt).toBe(1);
    expect(client.prepare('select count(*) as cnt from pages').get().cnt).toBe(1);
    expect(client.prepare('select count(*) as cnt from settings').get().cnt).toBe(1);
  });

  it('withTransaction returns the callback result (sync callback)', async () => {
    await initializeDb();
    const db = getDb();

    const result = await withTransaction(db, () => 123);
    expect(result).toBe(123);
  });

  it('withTransaction rejects async callbacks for synchronous sqlite driver', async () => {
    await initializeDb();
    const db = getDb();

    await expect(withTransaction(db, async () => 123)).rejects.toThrow(
      'withTransaction: async callbacks are not supported'
    );
  });

  it('closeDb resets the singleton instance', async () => {
    await initializeDb();
    await closeDb();
    expect(() => getDb()).toThrow('Database not initialized');
  });

  it('exports schema tables', () => {
    expect(usersTable).toBeDefined();
    expect(pagesTable).toBeDefined();
    expect(settingsTable).toBeDefined();
  });
});

function bootstrapSqliteSchema(client: any): void {
  client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      password_hash TEXT,
      role TEXT DEFAULT 'user',
      created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER)),
      updated_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER)),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      content TEXT,
      published INTEGER DEFAULT 0,
      author_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER)),
      updated_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER)),
      FOREIGN KEY(author_id) REFERENCES users(id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
    CREATE INDEX IF NOT EXISTS idx_pages_published ON pages(published);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER))
    );

    CREATE TABLE IF NOT EXISTS plugin_data (
      plugin_id TEXT NOT NULL,
      data_key TEXT NOT NULL,
      data_value TEXT,
      created_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER)),
      updated_at INTEGER NOT NULL DEFAULT (CAST(unixepoch() AS INTEGER)),
      PRIMARY KEY (plugin_id, data_key)
    );
    CREATE INDEX IF NOT EXISTS idx_plugin_data_plugin ON plugin_data(plugin_id);
  `);
}
