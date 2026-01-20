# Configuration Reference

Complete reference for all YLStack configuration options.

## Table of Contents

- [Platform](#platform)
- [Runtime](#runtime)
- [Database](#database)
- [Features](#features)
- [Admin](#admin)
- [Authentication](#authentication)
- [Storage](#storage)
- [Logging](#logging)
- [Server](#server)
- [Environment Variables](#environment-variables)

---

## Platform

Platform identity and versioning.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | string | `"YLStack"` | Platform name |
| `version` | string | `"1.0.0"` | Platform version (semver) |
| `description` | string | `undefined` | Platform description |

### YAML Example

```yaml
platform:
  name: "My Platform"
  version: "1.0.0"
  description: "My custom platform"
```

### Environment Variables

- `PLATFORM_NAME` - Overrides `platform.name`
- `PLATFORM_VERSION` - Overrides `platform.version`
- `PLATFORM_DESCRIPTION` - Overrides `platform.description`

---

## Runtime

Runtime adapter and deployment target configuration.

| Property | Type | Default | Options | Description |
|----------|------|---------|---------|-------------|
| `adapter` | string | `"node"` | `node`, `cloudflare` | Runtime adapter to use |
| `target` | string | `"vps"` | `vps`, `docker`, `pm2`, `workers` | Deployment target |

### YAML Example

```yaml
runtime:
  adapter: "node"
  target: "docker"
```

### Environment Variables

- `RUNTIME_ADAPTER` - Overrides `runtime.adapter`
- `RUNTIME_TARGET` - Overrides `runtime.target`

---

## Database

Database driver and connection settings.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `driver` | string | `"sqlite"` | Database driver (`sqlite`, `postgresql`, `d1`, `libsql`) |
| `url` | string | `"file:./data/app.db"` | Database connection URL |
| `poolSize` | number | `10` | Connection pool size |
| `connectionTimeout` | number | `30000` | Connection timeout in milliseconds |

### Driver Options

#### SQLite (Default)
```yaml
database:
  driver: "sqlite"
  url: "file:./data/app.db"
```

#### PostgreSQL
```yaml
database:
  driver: "postgresql"
  url: "postgresql://user:password@localhost:5432/dbname"
```

#### Cloudflare D1
```yaml
database:
  driver: "d1"
  url: "file:./data/app.db"  # Local file path
```

#### LibSQL (Turso)
```yaml
database:
  driver: "libsql"
  url: "file:./data/app.db"  # Or libsql:// URL
```

### Environment Variables

- `DATABASE_DRIVER` - Overrides `database.driver`
- `DATABASE_URL` - Overrides `database.url`
- `DATABASE_POOL_SIZE` - Overrides `database.poolSize`
- `DATABASE_CONNECTION_TIMEOUT` - Overrides `database.connectionTimeout`

---

## Features

Feature flags and limits.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `plugins.enabled` | array | `["plugin-pages", "plugin-forms"]` | List of enabled plugins |
| `plugins.disabled` | array | `[]` | List of disabled plugins |
| `pages.enabled` | boolean | `true` | Enable/disable pages feature |
| `pages.maxPages` | number | `100` | Maximum number of pages |
| `forms.enabled` | boolean | `true` | Enable/disable forms feature |
| `forms.maxForms` | number | `50` | Maximum number of forms |
| `users.enabled` | boolean | `true` | Enable/disable users feature |
| `users.maxUsers` | number | `1000` | Maximum number of users |

### YAML Example

```yaml
features:
  plugins:
    enabled:
      - "plugin-pages"
      - "plugin-forms"
      - "plugin-blog"
    disabled: []

  pages:
    enabled: true
    maxPages: 100

  forms:
    enabled: true
    maxForms: 50

  users:
    enabled: true
    maxUsers: 1000
```

### Environment Variables

- `PLUGINS_ENABLED` - Comma-separated list of enabled plugins
- `PLUGINS_DISABLED` - Comma-separated list of disabled plugins
- `PAGES_ENABLED` - Enable/disable pages (`true`/`false`)
- `FORMS_ENABLED` - Enable/disable forms (`true`/`false`)
- `USERS_ENABLED` - Enable/disable users (`true`/`false`)

---

## Admin

Admin panel branding and theme configuration.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `theme` | string | `"default"` | Admin theme |
| `branding.logo` | string | `undefined` | Logo URL |
| `branding.favicon` | string | `undefined` | Favicon URL |
| `branding.primaryColor` | string | `"#3B82F6"` | Primary brand color |
| `branding.name` | string | `"YLStack Admin"` | Admin panel name |
| `defaultRole` | string | `"admin"` | Default role for new users (`admin`, `editor`, `viewer`) |

### YAML Example

```yaml
admin:
  theme: "dark"
  branding:
    logo: "/assets/logo.png"
    favicon: "/favicon.ico"
    primaryColor: "#6366f1"
    name: "My Admin Panel"
  defaultRole: "editor"
```

### Environment Variables

- `ADMIN_THEME` - Overrides `admin.theme`
- `ADMIN_LOGO` - Overrides `admin.branding.logo`
- `ADMIN_FAVICON` - Overrides `admin.branding.favicon`
- `ADMIN_PRIMARY_COLOR` - Overrides `admin.branding.primaryColor`
- `ADMIN_BRAND_NAME` - Overrides `admin.branding.name`
- `ADMIN_DEFAULT_ROLE` - Overrides `admin.defaultRole`

---

## Authentication

Authentication provider and security settings.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `provider` | string | `"better-auth"` | Authentication provider |
| `jwtSecret` | string | **REQUIRED** | JWT secret key (min 32 chars) |
| `sessionDuration` | number | `86400` | Session duration in seconds (1 day) |
| `refreshTokenDuration` | number | `604800` | Refresh token duration (7 days) |
| `maxSessionAge` | number | `2592000` | Maximum session age (30 days) |
| `passwordMinLength` | number | `8` | Minimum password length |
| `passwordRequireUppercase` | boolean | `true` | Require uppercase letters |
| `passwordRequireLowercase` | boolean | `true` | Require lowercase letters |
| `passwordRequireNumbers` | boolean | `true` | Require numbers |
| `passwordRequireSpecialChars` | boolean | `false` | Require special characters |

### Security Notes

**IMPORTANT:** The `jwtSecret` must be at least 32 characters long. Generate a secure secret:

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**NEVER:** Hardcode secrets in `config.yaml`. Always use environment variables.

### YAML Example

```yaml
auth:
  provider: "better-auth"
  jwtSecret: "${JWT_SECRET}"  # From environment
  sessionDuration: 86400       # 1 day
  refreshTokenDuration: 604800 # 7 days
  maxSessionAge: 2592000       # 30 days

  passwordMinLength: 8
  passwordRequireUppercase: true
  passwordRequireLowercase: true
  passwordRequireNumbers: true
  passwordRequireSpecialChars: false
```

### Environment Variables

- `AUTH_PROVIDER` - Overrides `auth.provider`
- `JWT_SECRET` - **REQUIRED** - JWT secret key
- `AUTH_SESSION_DURATION` - Session duration in seconds
- `AUTH_REFRESH_TOKEN_DURATION` - Refresh token duration in seconds
- `AUTH_MAX_SESSION_AGE` - Maximum session age in seconds
- `AUTH_PASSWORD_MIN_LENGTH` - Minimum password length
- `AUTH_PASSWORD_REQUIRE_UPPERCASE` - Require uppercase (`true`/`false`)
- `AUTH_PASSWORD_REQUIRE_LOWERCASE` - Require lowercase (`true`/`false`)
- `AUTH_PASSWORD_REQUIRE_NUMBERS` - Require numbers (`true`/`false`)
- `AUTH_PASSWORD_REQUIRE_SPECIAL_CHARS` - Require special chars (`true`/`false`)

---

## Storage

File storage configuration.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `provider` | string | `"local"` | Storage provider (`local`, `s3`, `r2`) |
| `path` | string | `"./uploads"` | Local storage path |
| `bucket` | string | `undefined` | S3/R2 bucket name |
| `region` | string | `undefined` | S3/R2 region |
| `maxFileSize` | number | `10485760` | Maximum file size (10MB) |
| `allowedMimeTypes` | array | See default | Allowed MIME types |

### Provider Options

#### Local Storage (Default)
```yaml
storage:
  provider: "local"
  path: "./uploads"
```

#### AWS S3
```yaml
storage:
  provider: "s3"
  bucket: "my-bucket"
  region: "us-east-1"
```

#### Cloudflare R2
```yaml
storage:
  provider: "r2"
  bucket: "my-r2-bucket"
  region: "auto"
```

### Allowed MIME Types

Default allowed types:
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`
- `application/pdf`

### YAML Example

```yaml
storage:
  provider: "local"
  path: "./uploads"
  maxFileSize: 10485760  # 10MB
  allowedMimeTypes:
    - "image/jpeg"
    - "image/png"
    - "image/gif"
    - "image/webp"
    - "application/pdf"
```

### Environment Variables

- `STORAGE_PROVIDER` - Overrides `storage.provider`
- `STORAGE_PATH` - Overrides `storage.path`
- `STORAGE_BUCKET` - Overrides `storage.bucket`
- `STORAGE_REGION` - Overrides `storage.region`
- `STORAGE_MAX_FILE_SIZE` - Overrides `storage.maxFileSize`

---

## Logging

Logging configuration.

| Property | Type | Default | Options | Description |
|----------|------|---------|---------|-------------|
| `level` | string | `"info"` | `debug`, `info`, `warn`, `error` | Log level |
| `format` | string | `"pretty"` | `json`, `pretty` | Log format |
| `file` | string | `undefined` | Optional log file path |
| `maxFiles` | number | `10` | Maximum number of log files |
| `maxSize` | string | `"10m"` | Maximum log file size |

### YAML Example

```yaml
logging:
  level: "info"
  format: "pretty"
  file: "./logs/app.log"
  maxFiles: 10
  maxSize: "10m"
```

### Environment Variables

- `LOG_LEVEL` - Overrides `logging.level`
- `LOG_FORMAT` - Overrides `logging.format`
- `LOG_FILE` - Overrides `logging.file`
- `LOG_MAX_FILES` - Overrides `logging.maxFiles`
- `LOG_MAX_SIZE` - Overrides `logging.maxSize`

---

## Server

Server and API configuration.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `port` | number | `3000` | Server port |
| `host` | string | `"0.0.0.0"` | Server host |
| `cors.enabled` | boolean | `true` | Enable CORS |
| `cors.origin` | string/array | `"*"` | CORS origin(s) |
| `cors.credentials` | boolean | `true` | Allow credentials |
| `rateLimit.enabled` | boolean | `true` | Enable rate limiting |
| `rateLimit.windowMs` | number | `60000` | Rate limit window (1 min) |
| `rateLimit.maxRequests` | number | `100` | Max requests per window |

### YAML Example

```yaml
server:
  port: 3000
  host: "0.0.0.0"

  cors:
    enabled: true
    origin: ["https://example.com", "https://app.example.com"]
    credentials: true

  rateLimit:
    enabled: true
    windowMs: 60000
    maxRequests: 100
```

### Environment Variables

- `SERVER_PORT` - Overrides `server.port`
- `SERVER_HOST` - Overrides `server.host`
- `CORS_ENABLED` - Enable/disable CORS (`true`/`false`)
- `CORS_ORIGIN` - CORS origin(s)
- `CORS_CREDENTIALS` - Allow credentials (`true`/`false`)
- `RATE_LIMIT_ENABLED` - Enable rate limiting (`true`/`false`)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in ms
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window

---

## Environment Variables

All environment variables that can override config values:

### Platform
- `PLATFORM_NAME`
- `PLATFORM_VERSION`
- `PLATFORM_DESCRIPTION`

### Runtime
- `RUNTIME_ADAPTER`
- `RUNTIME_TARGET`

### Database
- `DATABASE_DRIVER`
- `DATABASE_URL`
- `DATABASE_POOL_SIZE`
- `DATABASE_CONNECTION_TIMEOUT`

### Features
- `PLUGINS_ENABLED` (comma-separated)
- `PLUGINS_DISABLED` (comma-separated)
- `PAGES_ENABLED`
- `FORMS_ENABLED`
- `USERS_ENABLED`

### Admin
- `ADMIN_THEME`
- `ADMIN_LOGO`
- `ADMIN_FAVICON`
- `ADMIN_PRIMARY_COLOR`
- `ADMIN_BRAND_NAME`
- `ADMIN_DEFAULT_ROLE`

### Auth
- `AUTH_PROVIDER`
- `JWT_SECRET` (REQUIRED)
- `AUTH_SESSION_DURATION`
- `AUTH_REFRESH_TOKEN_DURATION`
- `AUTH_MAX_SESSION_AGE`
- `AUTH_PASSWORD_MIN_LENGTH`
- `AUTH_PASSWORD_REQUIRE_UPPERCASE`
- `AUTH_PASSWORD_REQUIRE_LOWERCASE`
- `AUTH_PASSWORD_REQUIRE_NUMBERS`
- `AUTH_PASSWORD_REQUIRE_SPECIAL_CHARS`

### Storage
- `STORAGE_PROVIDER`
- `STORAGE_PATH`
- `STORAGE_BUCKET`
- `STORAGE_REGION`
- `STORAGE_MAX_FILE_SIZE`

### Logging
- `LOG_LEVEL`
- `LOG_FORMAT`
- `LOG_FILE`
- `LOG_MAX_FILES`
- `LOG_MAX_SIZE`

### Server
- `SERVER_PORT`
- `SERVER_HOST`
- `CORS_ENABLED`
- `CORS_ORIGIN`
- `CORS_CREDENTIALS`
- `RATE_LIMIT_ENABLED`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`

---

## Configuration Precedence

Values are merged in this order (later values override earlier ones):

1. **Defaults** - Built-in defaults in code
2. **config.yaml** - Base configuration file
3. **config.local.yaml** - Local overrides (gitignored)
4. **Environment Variables** - Highest priority

Example:
```yaml
# config.yaml
server:
  port: 3000
```

```bash
# .env
SERVER_PORT=4000
```

Result: `server.port = 4000` (env var overrides config file)

---

## Best Practices

1. **Never commit secrets** - Use environment variables for sensitive data
2. **Use config.local.yaml** - For local development overrides
3. **Document changes** - Add comments for custom config values
4. **Validate config** - App won't start with invalid configuration
5. **Use env variable templates** - `${JWT_SECRET}` syntax in YAML

---

## Troubleshooting

### "JWT_SECRET must be at least 32 characters"
Generate a secure secret and set the environment variable:
```bash
export JWT_SECRET=$(openssl rand -base64 32)
```

### "Configuration validation failed"
Check the error messages for specific validation failures and fix the config file.

### "Missing config file"
Create a `config.yaml` file in the project root, or ensure one exists.

### Env vars not overriding
Check that env var names are uppercase and match the documented names exactly.
