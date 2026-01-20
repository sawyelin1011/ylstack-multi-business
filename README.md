# YLStack - Universal Platform Engine

A production-ready configuration system with YAML → Zod validation, type safety, and environment variable overrides.

## Features

- ✅ **Configuration System** - YAML-based config with Zod validation
- ✅ **Type Safety** - Full TypeScript type inference
- ✅ **Environment Overrides** - Environment variables override YAML values
- ✅ **Validation** - Clear error messages for invalid config
- ✅ **Default Values** - Sensible defaults for all options
- ✅ **Hot Reload** - Reload configuration at runtime
- ✅ **Secrets Management** - Secure handling of sensitive values

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

- [Configuration Setup](CONFIG_SETUP.md) - How to configure the app
- [Configuration Reference](CONFIG_REFERENCE.md) - Complete config options

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
