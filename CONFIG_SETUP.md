# Configuration Setup Guide

Complete guide to setting up YLStack configuration.

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Basic Configuration](#basic-configuration)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Authentication Setup](#authentication-setup)
- [Storage Setup](#storage-setup)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

The quickest way to get started:

```bash
# 1. Copy the example environment file
cp .env.example .env

# 2. Generate a JWT secret
export JWT_SECRET=$(openssl rand -base64 32)

# 3. Add JWT_SECRET to .env file
echo "JWT_SECRET=$JWT_SECRET" >> .env

# 4. Start the application
bun run dev
```

That's it! The app will start with default configuration.

---

## Installation

### Step 1: Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install

# Or using yarn
yarn install
```

### Step 2: Set Up Environment File

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your settings
nano .env
```

### Step 3: Configure Application

Edit `config.yaml` to customize your application:

```yaml
platform:
  name: "My App"
  version: "1.0.0"

server:
  port: 3000
```

---

## Basic Configuration

### Minimal Configuration

The app will work with just an environment file:

```bash
# .env
JWT_SECRET=your-secure-secret-key-at-least-32-characters
```

All other values have sensible defaults.

### Custom Configuration

Edit `config.yaml` to customize:

```yaml
# Platform identity
platform:
  name: "My Awesome Platform"
  version: "1.0.0"
  description: "Built with YLStack"

# Runtime
runtime:
  adapter: "node"
  target: "docker"

# Server
server:
  port: 4000
  host: "0.0.0.0"
```

---

## Environment Variables

### Setting Environment Variables

#### In `.env` File (Recommended)

```bash
# .env
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost/db
SERVER_PORT=4000
```

#### In Shell

```bash
export JWT_SECRET=your-secret-key
export DATABASE_URL=postgresql://user:pass@localhost/db
export SERVER_PORT=4000
```

#### In Docker

```bash
docker run -e JWT_SECRET=your-secret-key \
           -e DATABASE_URL=postgresql://user:pass@localhost/db \
           -p 4000:3000 \
           my-app
```

#### In Docker Compose

```yaml
version: '3.8'
services:
  app:
    image: my-app
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=${DATABASE_URL}
      - SERVER_PORT=4000
```

### Required Environment Variables

Only one variable is **required**:

- `JWT_SECRET` - Must be at least 32 characters long

Generate it:
```bash
openssl rand -base64 32
```

### Optional Environment Variables

See [CONFIG_REFERENCE.md](CONFIG_REFERENCE.md) for the complete list.

---

## Database Setup

### SQLite (Default - No Setup Required)

SQLite works out of the box with no additional setup:

```yaml
database:
  driver: "sqlite"
  url: "file:./data/app.db"
```

### PostgreSQL

#### Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/)

#### Create Database

```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE ylstack;

# Create user (optional)
CREATE USER ylstack_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE ylstack TO ylstack_user;

# Exit
\q
```

#### Configure in config.yaml

```yaml
database:
  driver: "postgresql"
  url: "postgresql://ylstack_user:secure_password@localhost:5432/ylstack"
```

#### Or use environment variable

```bash
DATABASE_URL=postgresql://ylstack_user:secure_password@localhost:5432/ylstack
```

### Cloudflare D1

#### Create D1 Database

```bash
# Using Wrangler CLI
npx wrangler d1 create ylstack-db
```

#### Configure in config.yaml

```yaml
database:
  driver: "d1"
  url: "file:./data/app.db"
```

### LibSQL (Turso)

#### Create LibSQL Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create database
turso db create ylstack

# Get connection URL
turso db show ylstack --url
```

#### Configure in config.yaml

```yaml
database:
  driver: "libsql"
  url: "libsql://your-database-url.turso.io"
```

---

## Authentication Setup

### Generate JWT Secret

**Required for production:**

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Configure JWT Settings

```yaml
auth:
  provider: "better-auth"
  jwtSecret: "${JWT_SECRET}"  # From environment variable
  sessionDuration: 86400       # 1 day
  refreshTokenDuration: 604800 # 7 days
```

### Password Requirements

```yaml
auth:
  passwordMinLength: 8
  passwordRequireUppercase: true
  passwordRequireLowercase: true
  passwordRequireNumbers: true
  passwordRequireSpecialChars: false
```

---

## Storage Setup

### Local Storage (Default)

No setup required. Files are stored in `./uploads`:

```yaml
storage:
  provider: "local"
  path: "./uploads"
```

Make sure the directory exists:
```bash
mkdir -p ./uploads
```

### AWS S3

#### Create S3 Bucket

1. Go to AWS Console > S3
2. Create bucket
3. Configure CORS (optional)
4. Get access keys

#### Configure AWS Credentials

```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
```

#### Configure in config.yaml

```yaml
storage:
  provider: "s3"
  bucket: "my-bucket"
  region: "us-east-1"
  maxFileSize: 10485760  # 10MB
```

### Cloudflare R2

#### Create R2 Bucket

```bash
# Using Wrangler CLI
npx wrangler r2 bucket create my-bucket
```

#### Configure in config.yaml

```yaml
storage:
  provider: "r2"
  bucket: "my-r2-bucket"
  region: "auto"
```

#### Set R2 Credentials

```bash
export R2_ACCESS_KEY_ID=your-access-key
export R2_SECRET_ACCESS_KEY=your-secret-key
export R2_ACCOUNT_ID=your-account-id
```

---

## Local Development

### Using config.local.yaml

For local development overrides without affecting version control:

```yaml
# config.local.yaml (gitignored)
server:
  port: 4000

database:
  driver: "postgresql"
  url: "postgresql://user:pass@localhost/dev_db"

logging:
  level: "debug"
```

### Environment Variables for Development

```bash
# .env (local)
NODE_ENV=development
LOG_LEVEL=debug
SERVER_PORT=4000
DATABASE_URL=postgresql://user:pass@localhost/dev_db
JWT_SECRET=dev-secret-not-for-production
```

### Hot Reload Configuration

The configuration is loaded once at startup. To reload:

```typescript
import { reloadConfig } from '@ylstack/core';

// Reload configuration
const config = reloadConfig();
```

---

## Production Deployment

### Production Checklist

- [ ] Generate secure JWT secret
- [ ] Use PostgreSQL (not SQLite)
- [ ] Set `NODE_ENV=production`
- [ ] Configure S3 or R2 for storage
- [ ] Set appropriate log level (`info` or `warn`)
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set appropriate file upload limits

### Production Configuration Example

```yaml
# config.yaml
platform:
  name: "My Production App"
  version: "1.0.0"

runtime:
  adapter: "node"
  target: "docker"

database:
  driver: "postgresql"
  url: "${DATABASE_URL}"
  poolSize: 20
  connectionTimeout: 30000

server:
  port: 3000
  host: "0.0.0.0"

  cors:
    enabled: true
    origin: ["https://myapp.com", "https://www.myapp.com"]
    credentials: true

  rateLimit:
    enabled: true
    windowMs: 60000
    maxRequests: 100

logging:
  level: "info"
  format: "json"

auth:
  jwtSecret: "${JWT_SECRET}"
  sessionDuration: 86400

storage:
  provider: "s3"
  bucket: "${STORAGE_BUCKET}"
  region: "${STORAGE_REGION}"
```

### Production Environment Variables

```bash
# .env (production - DON'T COMMIT!)
NODE_ENV=production
JWT_SECRET=<generate with openssl>
DATABASE_URL=postgresql://user:pass@production-db:5432/app
STORAGE_BUCKET=my-production-bucket
STORAGE_REGION=us-east-1
```

### Docker Deployment

**Dockerfile:**
```dockerfile
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY . .
RUN bun run build

EXPOSE 3000

CMD ["bun", "run", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
```

---

## Troubleshooting

### "JWT_SECRET must be at least 32 characters"

**Solution:** Generate a secure secret:
```bash
openssl rand -base64 32
```

Add to `.env`:
```bash
JWT_SECRET=<generated-secret>
```

### "Configuration validation failed"

**Solution:** Check the error messages. Common issues:

1. **Invalid enum value:**
   ```yaml
   # Wrong
   runtime:
     adapter: "express"  # Not a valid option

   # Correct
   runtime:
     adapter: "node"    # Valid options: node, cloudflare
   ```

2. **Invalid type:**
   ```yaml
   # Wrong
   server:
     port: "3000"  # String instead of number

   # Correct
   server:
     port: 3000    # Number
   ```

### "Database connection failed"

**Solution:** Check database URL and credentials:

1. Ensure PostgreSQL is running
2. Verify connection string format
3. Check firewall/security group settings
4. Test connection:
   ```bash
   psql "postgresql://user:pass@localhost/db"
   ```

### "Env variables not overriding config"

**Solution:** Ensure env var names are correct:

1. Use uppercase with underscores: `DATABASE_URL` not `database_url`
2. Check spelling matches reference
3. Verify `.env` file is in project root
4. Restart application after changing `.env`

### "Missing config file"

**Solution:** The app will work without config files (uses defaults), but you can create one:

```bash
# Create config.yaml
cp config.yaml.example config.yaml  # If example exists
# Or create from scratch
touch config.yaml
```

### "TypeScript errors"

**Solution:** Install types:
```bash
bun add -d @types/node
```

---

## Configuration Examples

### Development Setup

```yaml
# config.yaml
platform:
  name: "My App (Dev)"

server:
  port: 4000

database:
  driver: "sqlite"
  url: "file:./data/dev.db"

logging:
  level: "debug"
  format: "pretty"

auth:
  jwtSecret: "${JWT_SECRET}"  # From .env
```

```bash
# .env
NODE_ENV=development
JWT_SECRET=dev-secret-not-for-production
LOG_LEVEL=debug
```

### Production Setup

```yaml
# config.yaml
platform:
  name: "My App"
  version: "1.0.0"

runtime:
  adapter: "node"
  target: "vps"

database:
  driver: "postgresql"
  url: "${DATABASE_URL}"
  poolSize: 20

server:
  port: 3000

logging:
  level: "info"
  format: "json"

storage:
  provider: "s3"
  bucket: "${STORAGE_BUCKET}"
  region: "${STORAGE_REGION}"

auth:
  jwtSecret: "${JWT_SECRET}"
```

```bash
# .env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=<secure-random-secret>
STORAGE_BUCKET=my-bucket
STORAGE_REGION=us-east-1
```

---

## Next Steps

- Read [CONFIG_REFERENCE.md](CONFIG_REFERENCE.md) for all config options
- Check [README.md](README.md) for more application setup
- Review [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues

---

## Need Help?

- Check the documentation
- Review configuration reference
- Check error messages carefully
- Ensure all environment variables are set correctly
