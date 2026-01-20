# Drizzle Migrations (Phase 1)

This folder is the output target for **drizzle-kit** migration generation.

## SQLite / D1 / libSQL

Schema source:

- `packages/core/src/lib/db/schema.ts`

Generate migrations:

```bash
bunx drizzle-kit generate
```

## PostgreSQL

Schema source:

- `packages/core/src/lib/db/schemas/postgresql.ts`

Generate migrations:

```bash
bunx drizzle-kit generate --config drizzle.postgres.config.ts
```

## Notes

- `DATABASE_URL` is used by drizzle-kit for database introspection and/or applying migrations depending on your workflow.
- Runtime migration execution will be added as part of the next database iteration (Phase 1.5+).
