# YLStack - Universal Platform Engine

A production-ready universal platform engine with comprehensive configuration, database abstraction, API layer, authentication system, admin dashboard, and plugin architecture. Built with TypeScript, Zod validation, Drizzle ORM, Hono framework, and SvelteKit.

## Features

### Core Platform
- ✅ **Configuration System** - YAML/JSON config with Zod validation and env overrides
- ✅ **Database Abstraction** - SQLite/PostgreSQL with Drizzle ORM and migrations
- ✅ **API Layer** - Hono framework with comprehensive middleware pipeline
- ✅ **Authentication** - JWT tokens, user management, RBAC, audit logging
- ✅ **Admin Dashboard** - SvelteKit SPA with responsive UI and management features
- ✅ **Plugin System** - Modular architecture with lifecycle hooks and admin integration

### Quality & Security
- ✅ **Type Safety** - Full TypeScript strict mode compliance
- ✅ **Validation** - Zod schema validation for all inputs
- ✅ **Error Handling** - Global error handling with custom error classes
- ✅ **Security** - Security headers, CORS, rate limiting, SQL injection prevention
- ✅ **Testing** - Comprehensive unit tests for all critical paths
- ✅ **Documentation** - Complete guides, references, and examples

### Production Ready
- ✅ **Environment Overrides** - 30+ supported environment variables
- ✅ **Default Values** - Sensible defaults for all options
- ✅ **Hot Reload** - Runtime configuration reload capability
- ✅ **Secrets Management** - Secure handling of sensitive values
- ✅ **Monitoring** - Health checks, metrics, and logging
- ✅ **Deployment** - Docker, CI/CD, and production configuration

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# Start application
bun run dev
```

## Documentation

### Core Documentation
- [Configuration Setup](CONFIG_SETUP.md) - How to configure the app
- [Configuration Reference](CONFIG_REFERENCE.md) - Complete config options
- [Database Setup](docs/DATABASE_SETUP.md) - Database configuration guide
- [Schema Design](docs/SCHEMA_DESIGN.md) - Database schema documentation

### Phase 1 Documentation
- [Development Guide](.docs/DEVELOPMENT.md) - Complete development guide (2000+ words)
- [Project Story](.docs/PROJECT_STORY.md) - Vision, achievements, and roadmap (1000+ words)
- [Phase 1 Status](.docs/PHASE_1_STATUS.md) - Executive summary and component status
- [TODO Audit](.docs/PHASE_1_TODO_AUDIT.md) - Comprehensive audit of TODOs and technical debt
- [Production Checklist](.docs/PHASE_1_PRODUCTION_CHECKLIST.md) - Detailed production readiness checklist

### Package Documentation
- [API Layer Documentation](packages/core/README_API.md) - Complete API guide
- [Authentication System](packages/core/README_AUTH.md) - Auth documentation
- [Plugin System](packages/core/README_PLUGINS.md) - Plugin development guide
- [Admin Dashboard](packages/admin/README.md) - Admin UI documentation

## Configuration

The application is configured through:

1. **`config.yaml`** - Main configuration file
2. **`config.local.yaml`** - Local overrides (gitignored)
3. **`.env`** - Environment variables (highest priority)

### Example

```yaml
# config.yaml
platform:
  name: "My App"
  version: "1.0.0"

server:
  port: 3000

database:
  driver: "sqlite"
  url: "file:./data/app.db"

auth:
  jwtSecret: "${JWT_SECRET}"  # From environment
```

## Usage

```typescript
import { getConfig, type Config } from '@ylstack/core';

// Get configuration
const config = getConfig();

// Access config values
console.log(config.platform.name);      // "My App"
console.log(config.server.port);        // 3000
console.log(config.database.driver);    // "sqlite"

// Get specific sections
const authConfig = getAuthConfig();
const dbConfig = getDatabaseConfig();
```

## Environment Variables

### Required

- `JWT_SECRET` - Must be at least 32 characters (generate with `openssl rand -base64 32`)

### Optional

See [CONFIG_REFERENCE.md](CONFIG_REFERENCE.md) for the complete list.

## Project Structure

```
ylstack/
├── packages/
│   └── core/
│       ├── src/
│       │   ├── lib/
│       │   │   └── config/
│       │   │       ├── schema.ts       # Zod schemas
│       │   │       ├── loader.ts       # YAML loader
│       │   │       ├── validator.ts    # Validation
│       │   │       ├── defaults.ts     # Default values
│       │   │       ├── types.ts        # TypeScript types
│       │   │       └── index.ts        # Public API
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── config.yaml              # Main configuration
├── .env.example             # Environment variables template
├── CONFIG_SETUP.md          # Setup guide
├── CONFIG_REFERENCE.md      # Complete reference
└── README.md
```

## Development

```bash
# Build
bun run build

# Watch mode
bun run build:core

# Type checking
bun run typecheck

# Linting
bun run lint
```

## License

MIT
