# Phase 1 Audit (Tasks 1.3 – 1.4)

Date: 2026-01-20
Branch: `ylstack-phase1-audit-and-prod-ready-tasks`

## Scope

- **Task 1.3 (Config System):** Verify production readiness.
- **Task 1.4 (Database Abstraction):** Fix blocking issues (exports/types), add missing driver schema wiring, add initial migration scaffolding, and add test coverage.

## Findings

### Task 1.3 – Configuration System

Status: **Production-ready** (as previously stated)

- Zod schemas present and strict.
- Loader supports YAML/JSON, env interpolation, deep merge, and env overrides.
- Secrets validation correctly blocks missing/short `JWT_SECRET`.
- Existing unit tests: `packages/core/src/lib/config/__tests__/index.test.ts`.

### Task 1.4 – Database Abstraction

Status before audit: **Mostly ready, but with several production blockers**

**Issues found (fixed in this audit):**

1. **Package exports were incomplete/incorrect**
   - `@ylstack/core` only exported config; DB layer was not reachable via package exports.
   - `./config` export path did not match TypeScript build output paths.

2. **Missing runtime dependency declaration**
   - `drizzle-orm` was used by `@ylstack/core` but not declared in `packages/core/package.json` dependencies.

3. **Broken TypeScript exports / invalid type imports**
   - `DatabaseSchema` was referenced as an exported type but was not exported from `client.ts`.
   - `types.ts` used `import type { usersTable }` for a runtime value export.

4. **Incorrect/invalid internal import alias**
   - `client.ts` imported configuration via `$lib/config` (SvelteKit-style alias), which is not defined in this repo.

5. **Schema variant not wired for PostgreSQL**
   - A PostgreSQL schema existed (`schemas/postgresql.ts`) but the client always used SQLite schema.

6. **SQLite URL handling and directory creation**
   - Config default and docs use `file:./...` URLs. Drivers like `better-sqlite3` require a filesystem path.
   - Opening a DB in a non-existent directory would fail.

## Changes Implemented

### Exports / Packaging

- `packages/core/src/index.ts`
  - Now exports both config and db modules.

- `packages/core/package.json`
  - Fixed export map paths to match `tsc` output (`dist/lib/...`).
  - Added `./db` subpath export.
  - Added missing dependency: `drizzle-orm`.

### Database Driver + Schema Wiring

- `packages/core/src/lib/db/schema.ts`
  - Added `sqliteSchema` named export (default export preserved).

- `packages/core/src/lib/db/schemas/postgresql.ts`
  - Added `postgresSchema` named export (default export preserved).

- `packages/core/src/lib/db/client.ts`
  - Fixed config import to `../config`.
  - Uses `sqliteSchema` for `sqlite`, `d1`, `libsql`.
  - Uses `postgresSchema` for `postgresql`.
  - Added raw client tracking and `getDbClient()`.
  - Added better connection cleanup in `closeDb()`.

- `packages/core/src/lib/db/url.ts`
  - Added `normalizeSqliteUrl()` and `ensureSqliteFileDirectory()`.

### Utilities

- `packages/core/src/lib/db/utils.ts`
  - `withTransaction()` helper (guards against async callbacks on sync SQLite driver).
  - `bulkInsert()` helper.
  - `seedDatabase()` helper.

### Migration Scaffolding (drizzle-kit)

- `drizzle.config.ts` (sqlite/d1/libsql)
- `drizzle.postgres.config.ts` (postgres)
- `packages/core/drizzle/README.md`

> Note: This provides **generation scaffolding**. Actual migration files will be generated via drizzle-kit as schema evolves.

### Tests

- Added `packages/core/src/lib/db/__tests__/db.test.ts`
  - Covers singleton behavior, raw client access, URL normalization, sqlite directory creation, bulk insert, seeding, and transaction helper behavior.

## Current Status

- Task 1.3: **Verified**
- Task 1.4: **Now unblocked and production-ready for Phase 1.5 work**, with core typing/export issues fixed and baseline tests in place.

## Recommended Next Improvements (Not blocking Phase 1.5)

- Add runtime migration execution helpers per driver (SQLite/libSQL/D1/Postgres) once the desired migration workflow is finalized.
- Add integration tests for PostgreSQL driver using a test container (or a CI service) once CI strategy is decided.
- Replace `console.*` usage with a structured logger when logging system lands (Phase 1.5+).
