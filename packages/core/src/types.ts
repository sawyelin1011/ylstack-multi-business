// Environment types for Cloudflare Workers and other runtimes

// Cloudflare D1 binding interface
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName: string): Promise<T | null>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: any;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

// Cloudflare-style environment
export interface Env {
  [key: string]: unknown;
  D1?: D1Database;
}

// Runtime-specific environment interface
export interface RuntimeEnv extends Env {
  DATABASE_URL?: string;
  DATABASE_DRIVER?: 'sqlite' | 'postgresql' | 'd1' | 'libsql';
}
