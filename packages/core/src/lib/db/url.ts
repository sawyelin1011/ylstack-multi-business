import * as fs from 'fs';
import * as path from 'path';

/**
 * Normalizes a SQLite URL to a filename path that can be consumed by drivers like
 * better-sqlite3.
 *
 * Examples:
 * - file:./data/app.db -> ./data/app.db
 * - file:///tmp/app.db -> /tmp/app.db
 */
export function normalizeSqliteUrl(url: string): string {
  if (url === ':memory:') {
    return url;
  }

  if (!url.startsWith('file:')) {
    return stripQuery(url);
  }

  let rest = url.slice('file:'.length);
  rest = stripQuery(rest);

  if (rest.startsWith('///')) {
    return rest.replace(/^\/+/, '/');
  }

  if (rest.startsWith('//')) {
    return rest.replace(/^\/+/, '/');
  }

  return rest;
}

export function ensureSqliteFileDirectory(filename: string): void {
  if (!filename || filename === ':memory:') {
    return;
  }

  const dir = path.dirname(filename);
  if (!dir || dir === '.') {
    return;
  }

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function stripQuery(value: string): string {
  const idx = value.indexOf('?');
  return idx === -1 ? value : value.slice(0, idx);
}
