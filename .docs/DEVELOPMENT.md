# YLStack Development Guide

## Quick Start

### Prerequisites
- Node.js 18+ (recommended: latest LTS)
- Bun package manager (recommended: latest version)
- Git
- SQLite (for development) or PostgreSQL

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/ylstack.git
cd ylstack

# Install dependencies
bun install

# Set up environment
cp .env.example .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# Start development server
bun run dev
```

### Build Commands

```bash
# Build all packages
bun run build

# Build core package only
cd packages/core
bun run build

# Watch mode for development
bun run build:core

# Type checking
bun run typecheck

# Linting
bun run lint

# Run tests
bun test
```

## Architecture Overview

YLStack follows a modular monorepo architecture with these core components:

### 1. Configuration System
- **Location:** `packages/core/src/lib/config/`
- **Purpose:** Centralized configuration management
- **Features:** YAML/JSON config, environment overrides, Zod validation

### 2. Database Layer
- **Location:** `packages/core/src/lib/db/`
- **Purpose:** Database abstraction and ORM integration
- **Features:** SQLite/PostgreSQL support, Drizzle ORM, migrations, transactions

### 3. API Layer
- **Location:** `packages/core/src/lib/api/`
- **Purpose:** HTTP API foundation
- **Features:** Hono framework, middleware pipeline, request validation, error handling

### 4. Authentication System
- **Location:** `packages/core/src/lib/auth/`
- **Purpose:** User authentication and authorization
- **Features:** JWT tokens, user management, RBAC, audit logging

### 5. Admin Dashboard
- **Location:** `packages/admin/`
- **Purpose:** Web-based administration interface
- **Features:** SvelteKit SPA, responsive UI, user management, plugin management

### 6. Plugin System
- **Location:** `packages/core/src/lib/plugins/`
- **Purpose:** Extensible plugin architecture
- **Features:** Lifecycle hooks, route registration, admin UI integration

## Configuration System

### Configuration Files

YLStack uses a layered configuration approach:

1. **`config.yaml`** - Main configuration (committed to git)
2. **`config.local.yaml`** - Local overrides (gitignored)
3. **`.env`** - Environment variables (highest priority)

### Configuration Structure

```yaml
# config.yaml
platform:
  name: "YLStack"
  version: "1.0.0"
  description: "Universal Platform Engine"

runtime:
  adapter: "node"  # node, cloudflare
  target: "vps"    # vps, docker, pm2, workers

server:
  port: 3000
  host: "0.0.0.0"
  cors:
    enabled: true
    origin: "*"
    methods: "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    headers: "Content-Type, Authorization, X-Request-ID"
    credentials: false
  rateLimit:
    enabled: true
    windowMs: 900000  # 15 minutes
    maxRequests: 100

database:
  driver: "sqlite"  # sqlite, postgresql, d1, libsql
  url: "file:./data/app.db"

auth:
  jwtSecret: "${JWT_SECRET}"  # From environment
  accessTokenExpiry: "15m"
  refreshTokenExpiry: "7d"
  password:
    minLength: 8
    requireUppercase: true
    requireLowercase: true
    requireNumbers: true
    requireSpecialChars: true

storage:
  provider: "local"  # local, s3, r2
  path: "./uploads"
  maxFileSize: "10MB"
  allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"]

logging:
  level: "info"  # debug, info, warn, error
  format: "pretty"  # pretty, json
  file:
    enabled: false
    path: "./logs/app.log"
    maxSize: "10MB"
    maxFiles: 5

features:
  plugins: true
  pages: true
  forms: true
  users: true
  admin: true

admin:
  theme: "light"  # light, dark, system
  branding:
    logo: "/logo.png"
    favicon: "/favicon.ico"
  defaultRole: "user"  # user, editor, admin

plugins:
  - "plugin-pages"
  - "plugin-forms"
```

### Environment Variables

Create `.env` file with required variables:

```bash
# Required
JWT_SECRET=your-secret-key-at-least-32-characters-long

# Database
DATABASE_URL=sqlite:./data/app.db

# Server
SERVER_PORT=3000
SERVER_HOST=0.0.0.0

# Auth
AUTH_JWT_SECRET=your-jwt-secret
AUTH_ACCESS_TOKEN_EXPIRY=15m
AUTH_REFRESH_TOKEN_EXPIRY=7d

# Storage
STORAGE_PROVIDER=local
STORAGE_PATH=./uploads

# Logging
LOG_LEVEL=info
LOG_FORMAT=pretty
```

### Using Configuration in Code

```typescript
import { 
  getConfig, 
  getServerConfig, 
  getDatabaseConfig,
  getAuthConfig,
  reloadConfig 
} from '@ylstack/core';

// Get complete configuration
const config = getConfig();
console.log(config.platform.name);  // "YLStack"

// Get specific sections
const serverConfig = getServerConfig();
const dbConfig = getDatabaseConfig();
const authConfig = getAuthConfig();

// Reload configuration at runtime
await reloadConfig();
```

## Database Layer

### Database Setup

#### SQLite (Development)

```bash
# SQLite is configured by default
# Database file will be created automatically at ./data/app.db
```

#### PostgreSQL (Production)

```bash
# Install PostgreSQL
docker run --name ylstack-postgres \
  -e POSTGRES_USER=ylstack \
  -e POSTGRES_PASSWORD=securepassword \
  -e POSTGRES_DB=ylstack \
  -p 5432:5432 \
  -d postgres:15

# Update config.yaml
database:
  driver: "postgresql"
  url: "postgresql://ylstack:securepassword@localhost:5432/ylstack"
```

### Database Operations

```typescript
import { 
  initializeDb, 
  getDb, 
  closeDb,
  getDbClient,
  withTransaction,
  bulkInsert,
  seedDatabase 
} from '@ylstack/core';

// Initialize database
const db = initializeDb();

// Get database instance
const database = getDb();

// Query data
const users = await db.select().from(usersTable);

// Insert data
const newUser = await db.insert(usersTable).values({
  email: 'user@example.com',
  name: 'John Doe',
}).returning();

// Update data
const updatedUser = await db.update(usersTable)
  .set({ name: 'Jane Doe' })
  .where(eq(usersTable.id, userId))
  .returning();

// Delete data
await db.delete(usersTable).where(eq(usersTable.id, userId));

// Transactions
const result = await withTransaction(db, async (tx) => {
  const user = await tx.insert(usersTable).values({ email: 'test@example.com' }).returning();
  const profile = await tx.insert(profilesTable).values({ userId: user[0].id }).returning();
  return { user, profile };
});

// Bulk insert
const usersToInsert = [{ email: 'a@example.com' }, { email: 'b@example.com' }];
await bulkInsert(db, usersTable, usersToInsert);

// Database seeding
const seedData = {
  users: [{ email: 'admin@example.com', role: 'admin' }],
  settings: [{ key: 'app_name', value: 'YLStack' }]
};
await seedDatabase(db, seedData);

// Close database connection
await closeDb();
```

### Database Schema

YLStack uses Drizzle ORM for schema definitions. The schema includes:

- **users**: User accounts and authentication
- **sessions**: User sessions and tokens
- **auditLogs**: Authentication and system events
- **settings**: Platform configuration
- **plugins**: Installed plugins and configuration

### Migrations

Generate migrations using drizzle-kit:

```bash
# Generate SQLite migrations
bunx drizzle-kit generate

# Generate PostgreSQL migrations
bunx drizzle-kit generate --config drizzle.postgres.config.ts
```

Migrations are stored in:
- `packages/core/drizzle/sqlite/` (SQLite)
- `packages/core/drizzle/postgres/` (PostgreSQL)

## API Development

### Creating API Endpoints

```typescript
import { createApiServer, successResponse, errorResponse } from '@ylstack/core';
import { z } from 'zod';

// Create server
const app = createApiServer();

// Simple GET endpoint
app.get('/api/hello', async (ctx) => {
  return successResponse({
    message: 'Hello from YLStack API!',
    timestamp: new Date().toISOString()
  });
});

// GET endpoint with validation
app.get('/api/users/:id', async (ctx) => {
  const userId = ctx.req.param('id');
  
  // Fetch user from database
  const user = await getUserById(userId);
  
  if (!user) {
    return errorResponse(new NotFoundError('User', { userId }));
  }
  
  return successResponse(user);
});

// POST endpoint with body validation
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

app.post('/api/users', 
  validateBody(createUserSchema),
  async (ctx) => {
    const validated = ctx.get('validatedBody');
    
    // Create user in database
    const user = await createUser(validated);
    
    return successResponse(user);
  }
);

// PUT endpoint with query and body validation
const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional()
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

app.put('/api/users/:id',
  validateParams(z.object({ id: z.string().uuid() })),
  validateQuery(paginationSchema),
  validateBody(updateUserSchema),
  async (ctx) => {
    const params = ctx.get('validatedParams');
    const query = ctx.get('validatedQuery');
    const body = ctx.get('validatedBody');
    
    const user = await updateUser(params.id, body);
    
    return successResponse(user);
  }
);

// DELETE endpoint
app.delete('/api/users/:id', async (ctx) => {
  const userId = ctx.req.param('id');
  
  await deleteUser(userId);
  
  return successResponse({ deleted: true });
});
```

### Request Validation

```typescript
import { validateBody, validateQuery, validateParams, CommonSchemas } from '@ylstack/core';

// Body validation
app.post('/api/users', 
  validateBody(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    age: z.number().optional()
  })),
  async (ctx) => {
    const user = ctx.get('validatedBody');
    // user is typed: { name: string, email: string, age?: number }
  }
);

// Query validation
app.get('/api/users',
  validateQuery(z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional()
  })),
  async (ctx) => {
    const { page, limit, search } = ctx.get('validatedQuery');
  }
);

// Parameter validation
app.get('/api/users/:id',
  validateParams(z.object({
    id: z.string().uuid()
  })),
  async (ctx) => {
    const { id } = ctx.get('validatedParams');
  }
);

// Combined validation
app.post('/api/users/:id/posts',
  validate(
    z.object({ title: z.string(), content: z.string() }), // body
    z.object({ draft: z.coerce.boolean().optional() }),     // query
    z.object({ id: z.string().uuid() })                    // params
  ),
  async (ctx) => {
    const body = ctx.get('validatedBody');
    const query = ctx.get('validatedQuery');
    const params = ctx.get('validatedParams');
  }
);

// Common schemas
app.get('/api/users',
  validateQuery(CommonSchemas.pagination),
  async (ctx) => {
    const { page, limit } = ctx.get('validatedQuery');
  }
);
```

### Error Handling

```typescript
import { 
  ValidationError, 
  NotFoundError, 
  UnauthorizedError,
  ForbiddenError,
  InternalError,
  errorResponse 
} from '@ylstack/core';

// Custom error handling
app.get('/api/users/:id', async (ctx) => {
  try {
    const userId = ctx.req.param('id');
    const user = await getUserById(userId);
    
    if (!user) {
      throw new NotFoundError('User', { userId });
    }
    
    return successResponse(user);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return errorResponse(error);
    } else if (error instanceof ValidationError) {
      return errorResponse(error);
    } else {
      return errorResponse(new InternalError('Failed to fetch user'));
    }
  }
});

// Using error classes
throw new ValidationError('Invalid email format', {
  fields: { email: ['Must be a valid email'] }
});

throw new NotFoundError('User', { userId: '123' });

throw new UnauthorizedError('Authentication required');

throw new ForbiddenError('Insufficient permissions', {
  required: 'admin',
  user: { roles: ['user'] }
});

throw new InternalError('Database connection failed', {
  operation: 'connect'
});
```

### Response Format

```typescript
import { 
  successResponse, 
  errorResponse, 
  createdResponse,
  noContentResponse,
  paginatedResponse 
} from '@ylstack/core';

// Success response
app.get('/api/users', async (ctx) => {
  const users = await getUsers();
  return successResponse(users);
});

// Created response (201)
app.post('/api/users', async (ctx) => {
  const user = await createUser(body);
  return createdResponse(user);
});

// Error response
app.get('/api/users/:id', async (ctx) => {
  const user = await getUserById(ctx.req.param('id'));
  if (!user) {
    return errorResponse(new NotFoundError('User'));
  }
  return successResponse(user);
});

// No content response (204)
app.delete('/api/users/:id', async (ctx) => {
  await deleteUser(ctx.req.param('id'));
  return noContentResponse();
});

// Paginated response
app.get('/api/users', async (ctx) => {
  const { page, limit } = ctx.get('validatedQuery');
  const { users, total } = await getPaginatedUsers(page, limit);
  
  return paginatedResponse(users, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  });
});

// Custom response with metadata
return successResponse(data, {
  requestId: 'req-123',
  duration: 150,
  cache: { hit: true, ttl: 300 }
});
```

### Middleware

```typescript
import { 
  requestIdMiddleware, 
  loggerMiddleware, 
  timingMiddleware,
  securityMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
  errorHandlerMiddleware 
} from '@ylstack/core';

// Add middleware to server
const app = createApiServer();

// Middleware is added automatically in the correct order:
// 1. Request ID
// 2. Logger
// 3. Timing
// 4. Security
// 5. CORS
// 6. Rate Limit
// 7. Error Handler

// Access request context
app.get('/api/test', async (ctx) => {
  // Get request ID
  const requestId = ctx.get('requestId');
  
  // Get logger
  const logger = ctx.get('logger');
  logger.info('Processing request', { requestId });
  
  // Get database
  const db = ctx.get('db');
  
  // Get authenticated user
  const user = ctx.get('user');
  
  return successResponse({ requestId });
});
```

### Context Utilities

```typescript
import { ContextUtils } from '@ylstack/core';

app.get('/api/protected', async (ctx) => {
  // Check authentication
  if (!ContextUtils.isAuthenticated(ctx)) {
    return errorResponse(new UnauthorizedError('Authentication required'));
  }
  
  // Check role
  if (!ContextUtils.hasRole(ctx, 'admin')) {
    return errorResponse(new ForbiddenError('Admin access required'));
  }
  
  // Get request ID
  const requestId = ContextUtils.getRequestId(ctx);
  
  // Get logger
  const logger = ContextUtils.getLogger(ctx);
  
  // Get database
  const db = ContextUtils.getDatabase(ctx);
  
  // Get user
  const user = ContextUtils.getUser(ctx);
  
  return successResponse({ userId: user.id });
});
```

## Authentication System

### User Management

```typescript
import { 
  createUser, 
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  listUsers 
} from '@ylstack/core';

// Create user
const user = await createUser({
  email: 'user@example.com',
  name: 'John Doe',
  password: 'SecurePass123!',
  role: 'user'
});

// Get user by ID
const user = await getUserById('user-123');

// Get user by email
const user = await getUserByEmail('user@example.com');

// Update user
const updatedUser = await updateUser('user-123', {
  name: 'Jane Doe',
  role: 'editor'
});

// Delete user
await deleteUser('user-123');

// List users with pagination
const { users, total } = await listUsers({
  page: 1,
  limit: 20,
  search: 'john',
  role: 'admin'
});
```

### Authentication

```typescript
import { 
  registerUser, 
  loginUser,
  logoutUser,
  refreshToken,
  verifyAccessToken,
  verifyRefreshToken 
} from '@ylstack/core';

// Register new user
const { user, tokens } = await registerUser({
  email: 'user@example.com',
  name: 'John Doe',
  password: 'SecurePass123!'
});

// Login user
const { user, tokens } = await loginUser({
  email: 'user@example.com',
  password: 'SecurePass123!'
});

// Logout user
await logoutUser('user-123');

// Logout all sessions
await logoutAllSessions('user-123');

// Refresh access token
const { accessToken, refreshToken: newRefreshToken } = await refreshToken(
  'current-refresh-token'
);

// Verify access token
const payload = await verifyAccessToken('access-token');
// Returns: { id: string, email: string, role: string, iat: number, exp: number }

// Verify refresh token
const payload = await verifyRefreshToken('refresh-token');
```

### Token Management

```typescript
import { 
  generateTokenPair,
  generateAccessToken,
  generateRefreshToken,
  revokeToken,
  revokeAllTokens 
} from '@ylstack/core';

// Generate token pair
const { accessToken, refreshToken } = await generateTokenPair(user.id, {
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role
});

// Generate access token
const accessToken = await generateAccessToken(user.id, {
  id: user.id,
  email: user.email,
  role: user.role
});

// Generate refresh token
const refreshToken = await generateRefreshToken(user.id);

// Revoke specific token
await revokeToken('token-id');

// Revoke all tokens for user
await revokeAllTokens(user.id);
```

### Password Management

```typescript
import { 
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  changePassword 
} from '@ylstack/core';

// Validate password strength
const result = await validatePasswordStrength('password123', {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
});

// Hash password
const hashedPassword = await hashPassword('SecurePass123!');

// Verify password
const isValid = await verifyPassword('SecurePass123!', hashedPassword);

// Change password
await changePassword(user.id, 'old-password', 'new-password');
```

### Authorization

```typescript
import { 
  hasRole,
  hasPermission,
  checkPermission,
  requireAuth,
  requireRole,
  requirePermission 
} from '@ylstack/core';

// Check if user has role
const isAdmin = await hasRole(user.id, 'admin');

// Check if user has permission
const canDelete = await hasPermission(user.id, 'users.delete');

// Check permission with context
const canEdit = await checkPermission(user.id, 'content.edit', {
  contentId: 'content-123',
  ownerId: user.id
});

// Middleware for route protection
app.use('/admin', requireAuth());
app.use('/admin/users', requireRole('admin'));
app.use('/admin/content', requirePermission('content.manage'));
```

### Audit Logging

```typescript
import { logAuthEvent } from '@ylstack/core';

// Log authentication event
await logAuthEvent({
  userId: user.id,
  eventType: 'login',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  success: true,
  metadata: {
    method: 'email_password',
    device: 'desktop'
  }
});

// Event types:
// - register
// - login
// - logout
// - password_change
// - token_generated
// - session_created
// - session_revoked
// - all_sessions_revoked
// - token_refresh
// - token_revoked
```

## Admin Dashboard

### Development Setup

```bash
# Navigate to admin package
cd packages/admin

# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Run tests
bun run test

# Type checking
bun run check
```

### Configuration

Create `.env` file in `packages/admin`:

```bash
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=YLStack Admin
VITE_APP_VERSION=1.0.0
```

### API Client

```typescript
import { api } from '$lib/api/client';

// GET request
const response = await api.get('/api/users');

// POST request
const result = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password'
});

// PUT request
await api.put('/api/users/1', { name: 'Updated Name' });

// DELETE request
await api.delete('/api/users/1');

// Custom headers
const response = await api.get('/api/data', {
  headers: {
    'X-Custom-Header': 'value'
  }
});

// Error handling
try {
  const response = await api.post('/api/endpoint', data);
} catch (error) {
  if (error.response) {
    console.error('API Error:', error.response.status, error.response.data);
  } else {
    console.error('Network Error:', error.message);
  }
}
```

### Auth Store

```typescript
import { auth, user, isAuthenticated } from '$lib/auth/store';

// Initialize auth store
await auth.initialize();

// Login
try {
  await auth.login('user@example.com', 'password');
} catch (error) {
  console.error('Login failed:', error.message);
}

// Logout
await auth.logout();

// Logout all sessions
await auth.logoutAll();

// Subscribe to user changes
user.subscribe(currentUser => {
  console.log('Current user:', currentUser);
});

// Check authentication status
if ($isAuthenticated) {
  console.log('User is logged in');
}

// Get current user
const currentUser = $user;

// Get access token
const token = auth.getToken();

// Refresh token
await auth.refreshToken();
```

### Route Protection

```typescript
// +page.ts or +layout.ts
import { redirect } from '@sveltejs/kit';
import { isAuthenticated, hasRole } from '$lib/auth/store';

export const load = async () => {
  // Require authentication
  if (!$isAuthenticated) {
    throw redirect(302, '/login');
  }

  // Require specific role
  if (!hasRole('admin')) {
    throw redirect(302, '/');
  }

  // Fetch protected data
  const response = await api.get('/api/protected-data');
  
  return {
    data: response.data
  };
};
```

### Adding New Pages

```bash
# Create new page
mkdir -p src/routes/admin/new-page

# Create page component
touch src/routes/admin/new-page/+page.svelte

# Create page loader (optional)
touch src/routes/admin/new-page/+page.ts
```

```svelte
<!-- src/routes/admin/new-page/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import MainLayout from '$lib/layouts/MainLayout.svelte';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';

  let data = [];
  let loading = false;
  let error = '';

  async function loadData() {
    loading = true;
    error = '';
    try {
      const response = await api.get('/api/new-page/data');
      data = response.data;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadData();
  });
</script>

<MainLayout>
  <h1 class="text-2xl font-bold mb-6">New Page</h1>
  
  <Card>
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Data</h2>
      <Button on:click={loadData} loading={loading}>
        Refresh
      </Button>
    </div>

    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    {:else if loading}
      <p>Loading data...</p>
    {:else if data.length === 0}
      <p>No data available.</p>
    {:else}
      <ul class="space-y-2">
        {#each data as item}
          <li class="p-2 border-b last:border-b-0">{item.name}</li>
        {/each}
      </ul>
    {/if}
  </Card>
</MainLayout>
```

### Adding to Navigation

```svelte
<!-- src/lib/components/Sidebar.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { hasPermission } from '$lib/auth/store';

  const navigation = [
    { path: '/admin', label: 'Dashboard', icon: 'Home' },
    { path: '/admin/users', label: 'Users', icon: 'Users' },
    { path: '/admin/plugins', label: 'Plugins', icon: 'Puzzle' },
    { path: '/admin/settings', label: 'Settings', icon: 'Settings' },
    { path: '/admin/new-page', label: 'New Page', icon: 'File' }, // Add new page
  ];

  function isActive(path: string) {
    return $page.url.pathname.startsWith(path);
  }
</script>
```

## Plugin System

### Creating a Plugin

```typescript
import type { Plugin } from '@ylstack/core';
import { createPlugin } from '@ylstack/core';

export const myPlugin: Plugin = createPlugin('my-plugin', '1.0.0')
  .metadata({
    description: 'My awesome plugin',
    author: 'Your Name',
    license: 'MIT',
    homepage: 'https://github.com/your-repo/my-plugin',
    keywords: ['example', 'demo']
  })
  .addRoute({
    path: '/api/my-plugin',
    method: 'GET',
    handler: async (c) => {
      return c.json({ message: 'Hello from plugin!' });
    },
    auth: true,
    permissions: ['my-plugin.access']
  })
  .addRoute({
    path: '/api/my-plugin/data',
    method: 'POST',
    handler: async (c) => {
      const body = await c.req.json();
      const db = c.get('db');
      const user = c.get('user');
      
      // Process data
      const result = await processData(body, db, user);
      
      return c.json(result);
    },
    auth: true,
    permissions: ['my-plugin.manage']
  })
  .addMiddleware({
    name: 'my-plugin-middleware',
    handler: async (c, next) => {
      const logger = c.get('logger');
      logger.info('My plugin middleware executed');
      
      await next();
    },
    priority: 10
  })
  .addHook('content:create', async (data, ctx) => {
    const logger = ctx.logger;
    logger.info('Content created:', data);
    
    // Add plugin-specific processing
    await processContent(data);
  }, 10)
  .addHook('app:ready', async (data, ctx) => {
    ctx.logger.info('My plugin ready');
    await initializePluginResources(ctx);
  }, 5)
  .lifecycle({
    async install(ctx) {
      const db = ctx.db;
      ctx.logger.info('Installing my plugin');
      
      // Create database tables
      await createPluginTables(db);
      
      // Add default data
      await seedPluginData(db);
    },
    
    async activate(ctx) {
      ctx.logger.info('Activating my plugin');
      
      // Initialize services
      await startPluginServices();
      
      // Register hooks
      await registerPluginHooks();
    },
    
    async deactivate(ctx) {
      ctx.logger.info('Deactivating my plugin');
      
      // Clean up services
      await stopPluginServices();
      
      // Unregister hooks
      await unregisterPluginHooks();
    },
    
    async uninstall(ctx) {
      const db = ctx.db;
      ctx.logger.info('Uninstalling my plugin');
      
      // Clean up database
      await dropPluginTables(db);
      
      // Remove plugin data
      await cleanupPluginData();
    }
  })
  .config({
    apiKey: {
      type: 'string',
      required: true,
      description: 'API key for external service',
      default: ''
    },
    maxRetries: {
      type: 'number',
      required: false,
      description: 'Maximum number of retries',
      default: 3
    },
    enabledFeatures: {
      type: 'array',
      required: false,
      description: 'Features to enable',
      default: ['feature1', 'feature2']
    }
  })
  .dependencies([
    'content-plugin',
    'auth-plugin'
  ])
  .build();
```

### Plugin Lifecycle

```typescript
import { 
  installPlugin,
  uninstallPlugin,
  activatePlugin,
  deactivatePlugin,
  listAllPlugins,
  getActivePlugins,
  getPluginByName,
  validatePlugin 
} from '@ylstack/core';

// Install plugin
const result = await installPlugin(myPlugin, {
  apiKey: 'secret-key',
  maxRetries: 5
});

// Uninstall plugin
await uninstallPlugin('my-plugin');

// Activate plugin
await activatePlugin('my-plugin');

// Deactivate plugin
await deactivatePlugin('my-plugin');

// List all plugins
const allPlugins = listAllPlugins();

// Get active plugins
const activePlugins = getActivePlugins();

// Get specific plugin
const plugin = getPluginByName('my-plugin');

// Validate plugin
const validation = validatePlugin(myPlugin);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### Plugin Hooks

```typescript
import { hookSystem } from '@ylstack/core';

// Register hook
hookSystem.register('content:create', async (data, ctx) => {
  ctx.logger.info('Content created:', data);
  await processContent(data);
}, 10, 'my-plugin');

// Execute hooks
const result = await hookSystem.execute('content:create', {
  id: 'content-1',
  title: 'My Content',
  content: 'Hello World'
});

// Unregister hook
hookSystem.unregister('content:create', 'my-plugin');

// Standard hooks available:
// - app:init
// - app:ready
// - app:shutdown
// - request:start
// - request:end
// - request:error
// - auth:register
// - auth:login
// - auth:logout
// - auth:password_change
// - content:create
// - content:update
// - content:delete
// - content:publish
// - plugin:install
// - plugin:activate
// - plugin:deactivate
// - plugin:uninstall
```

### Plugin Routes

```typescript
.addRoute({
  path: '/api/my-plugin',
  method: 'GET',
  handler: async (c) => {
    return c.json({ message: 'Hello from plugin!' });
  },
  auth: true,                    // Require authentication
  permissions: ['admin'],        // Require specific permissions
  tags: ['public'],              // Route tags for filtering
  description: 'Plugin endpoint' // Route description
})
```

### Plugin Middleware

```typescript
.addMiddleware({
  name: 'my-plugin-middleware',
  handler: async (c, next) => {
    const logger = c.get('logger');
    const startTime = Date.now();
    
    logger.info('My plugin middleware: request started');
    
    await next();
    
    const duration = Date.now() - startTime;
    logger.info('My plugin middleware: request completed', { duration });
  },
  priority: 10,  // Higher priority executes first
  tags: ['timing'] // Middleware tags
})
```

### Plugin Database Models

```typescript
.addModel('myPluginData', {
  id: 'string',
  name: 'string',
  data: 'json',
  createdAt: 'timestamp',
  updatedAt: 'timestamp'
})
```

### Plugin Services

```typescript
.addService('myService', (ctx) => {
  return {
    processData: async (data) => {
      ctx.logger.info('Processing data');
      return transformData(data);
    },
    validateInput: (input) => {
      return validateInputSchema(input);
    }
  };
})
```

### Plugin Admin Pages

```typescript
.addAdminPage({
  path: '/admin/my-plugin',
  title: 'My Plugin',
  icon: 'Settings',
  permissions: ['admin'],
  order: 10,
  component: () => import('./MyPluginPage.svelte')
})
```

## Testing

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test packages/core/src/lib/config/__tests__/index.test.ts

# Run tests with coverage
bun test --coverage

# Watch mode
bun test --watch
```

### Writing Tests

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getConfig } from '@ylstack/core';

describe('Configuration System', () => {
  beforeEach(() => {
    // Setup before each test
    vi.mock('../config', () => ({
      getConfig: vi.fn(() => mockConfig)
    }));
  });

  afterEach(() => {
    // Cleanup after each test
    vi.restoreAllMocks();
  });

  it('should load configuration', () => {
    const config = getConfig();
    expect(config).toBeDefined();
    expect(config.platform.name).toBe('YLStack');
  });

  it('should validate configuration', () => {
    const invalidConfig = { platform: { name: '' } };
    expect(() => validateConfig(invalidConfig)).toThrow();
  });

  it('should handle environment variables', () => {
    process.env.JWT_SECRET = 'test-secret-32-chars-long';
    const config = getConfig();
    expect(config.auth.jwtSecret).toBe('test-secret-32-chars-long');
  });
});
```

### Test Utilities

```typescript
// Mocking dependencies
vi.mock('../db', () => ({
  initializeDb: vi.fn(() => mockDb),
  getDb: vi.fn(() => mockDb)
}));

// Creating test context
const createTestContext = () => ({
  req: {
    method: 'GET',
    url: 'http://localhost:3000/test',
    param: () => ({}),
    query: () => ({}),
    json: async () => ({})
  },
  res: new Response(),
  set: vi.fn(),
  get: vi.fn(),
  header: vi.fn(),
  status: vi.fn(() => context),
  json: vi.fn((data) => {
    context.res = new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    return context.res;
  })
});

// Testing middleware
const middleware = validateBody(userSchema);
const ctx = createTestContext();

let error = null;
try {
  await middleware(ctx, async () => {});
} catch (e) {
  error = e;
}

expect(error).toBeNull();
expect(ctx.set).toHaveBeenCalledWith('validatedBody', expectedData);
```

## Deployment

### Local Deployment

```bash
# Build all packages
bun run build

# Start API server
cd packages/core
bun run start

# Start admin dashboard (in separate terminal)
cd packages/admin
bun run preview
```

### Docker Deployment

```dockerfile
# Dockerfile for API
FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy source files
COPY . .

# Build
RUN bun run build

# Run
CMD ["bun", "run", "start"]
```

```dockerfile
# Dockerfile for Admin
FROM node:18-alpine

WORKDIR /app

# Install Bun
RUN npm install -g bun

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy source files
COPY . .

# Build
RUN bun run build

# Serve with Nginx
FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Production Configuration

```yaml
# config.yaml for production
platform:
  name: "YLStack Production"
  version: "1.0.0"
  environment: "production"

server:
  port: 3000
  host: "0.0.0.0"
  cors:
    enabled: true
    origin: "https://yourdomain.com"
    methods: "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    headers: "Content-Type, Authorization, X-Request-ID"
    credentials: true
  rateLimit:
    enabled: true
    windowMs: 60000  # 1 minute
    maxRequests: 200

logging:
  level: "info"
  format: "json"
  file:
    enabled: true
    path: "./logs/app.log"
    maxSize: "10MB"
    maxFiles: 10
```

### Environment Variables for Production

```bash
# .env.production
NODE_ENV=production

# Server
SERVER_PORT=3000
SERVER_HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:password@db:5432/ylstack

# Auth
JWT_SECRET=your-production-secret-at-least-32-characters-long
AUTH_ACCESS_TOKEN_EXPIRY=15m
AUTH_REFRESH_TOKEN_EXPIRY=7d

# Storage
STORAGE_PROVIDER=s3
STORAGE_BUCKET=your-bucket-name
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY=your-access-key
STORAGE_SECRET_KEY=your-secret-key

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      - name: Install dependencies
        run: bun install
      - name: Run tests
        run: bun test
      - name: Build
        run: bun run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      - name: Install dependencies
        run: bun install
      - name: Build
        run: bun run build
      - name: Deploy to production
        run: # Your deployment commands here
```

## Troubleshooting

### Common Issues

#### Database Connection Issues

**Symptom:** Database connection fails

**Solutions:**
1. Check database URL in config.yaml
2. Verify database server is running
3. Check environment variables
4. Test connection manually

```bash
# Test SQLite connection
sqlite3 ./data/app.db

# Test PostgreSQL connection
psql postgresql://user:password@localhost:5432/ylstack
```

#### Configuration Loading Errors

**Symptom:** Configuration validation fails

**Solutions:**
1. Check config.yaml syntax
2. Verify required environment variables
3. Check for typos in configuration
4. Run validation manually

```bash
bun run validate-config
```

#### Authentication Failures

**Symptom:** Login fails or tokens are invalid

**Solutions:**
1. Verify JWT_SECRET is set and at least 32 characters
2. Check token expiration settings
3. Verify user credentials
4. Check audit logs for authentication events

```bash
# Generate new JWT secret
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
```

#### API Endpoint Not Found

**Symptom:** 404 errors for API endpoints

**Solutions:**
1. Check route registration
2. Verify server is running
3. Check middleware order
4. Test with health endpoint

```bash
curl http://localhost:3000/health
```

#### Admin Dashboard Not Loading

**Symptom:** Admin dashboard shows blank page or errors

**Solutions:**
1. Check API_URL in admin .env file
2. Verify backend API is running
3. Check browser console for errors
4. Clear browser cache

```bash
# Check admin configuration
cat packages/admin/.env
```

### Debugging Techniques

#### Enable Debug Logging

```yaml
# config.yaml
logging:
  level: "debug"
  format: "pretty"
```

#### Check Logs

```bash
# Check application logs
tail -f logs/app.log

# Check database logs (PostgreSQL)
docker logs ylstack-postgres

# Check API server logs
journalctl -u ylstack-api -f
```

#### Database Inspection

```bash
# SQLite
sqlite3 ./data/app.db
SELECT * FROM users;

# PostgreSQL
psql postgresql://user:password@localhost:5432/ylstack
SELECT * FROM users;
```

#### Network Debugging

```bash
# Test API endpoints
curl -v http://localhost:3000/health

# Test with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/me

# Check open ports
netstat -tuln | grep 3000
```

## Best Practices

### Configuration Management

1. **Use environment variables for secrets**
2. **Store configuration in version control**
3. **Use config.local.yaml for local overrides**
4. **Validate configuration at startup**
5. **Document all configuration options**

### Database Operations

1. **Use transactions for multi-step operations**
2. **Parameterize all queries to prevent SQL injection**
3. **Use migrations for schema changes**
4. **Implement proper error handling**
5. **Optimize queries with indexes**

### API Development

1. **Validate all inputs**
2. **Use standardized response format**
3. **Implement proper error handling**
4. **Use appropriate HTTP status codes**
5. **Document all endpoints**

### Authentication

1. **Never store plain text passwords**
2. **Use strong password requirements**
3. **Implement token expiration**
4. **Log all authentication events**
5. **Use HTTPS in production**

### Security

1. **Keep dependencies updated**
2. **Use security headers**
3. **Implement rate limiting**
4. **Validate all user input**
5. **Regular security audits**

### Performance

1. **Use database indexing**
2. **Implement caching where appropriate**
3. **Optimize database queries**
4. **Use connection pooling**
5. **Monitor performance metrics**

## Contributing

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make your changes**
   - Follow existing code patterns
   - Add appropriate tests
   - Update documentation

3. **Run tests**
   ```bash
   bun test
   ```

4. **Build and verify**
   ```bash
   bun run build
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature"
   ```

6. **Push to repository**
   ```bash
   git push origin feature/your-feature
   ```

7. **Create pull request**
   - Provide clear description
   - Reference related issues
   - Request review

### Code Style Guidelines

1. **Use TypeScript strict mode**
2. **Follow existing code patterns**
3. **Use meaningful variable names**
4. **Add JSDoc comments**
5. **Keep functions focused and small**
6. **Use async/await for asynchronous code**
7. **Handle errors appropriately**

### Documentation Standards

1. **Update README files**
2. **Add JSDoc comments**
3. **Document new features**
4. **Update configuration reference**
5. **Add usage examples**

## Support

### Getting Help

1. **Check documentation** - Start with this guide
2. **Review examples** - Look at existing code
3. **Check issues** - Search GitHub issues
4. **Ask questions** - Open a new issue
5. **Community** - Join discussion forums

### Reporting Issues

When reporting issues, please include:
- **Version** - YLStack version
- **Environment** - Node.js, Bun, OS versions
- **Steps to reproduce** - Clear reproduction steps
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Logs** - Relevant log output
- **Configuration** - Relevant config snippets

### Feature Requests

For feature requests, please provide:
- **Use case** - Why this feature is needed
- **Proposed solution** - How it might work
- **Alternatives** - Other approaches considered
- **Impact** - Who would benefit from this

## Roadmap

### Phase 1 (Complete) ✅
- Configuration system
- Database abstraction
- API layer
- Authentication system
- Admin dashboard
- Plugin architecture

### Phase 2 (Planned)
- Enhanced testing (integration, E2E)
- Performance optimization
- Additional plugins
- Advanced features (webhooks, scheduled tasks)
- Improved documentation
- Community plugins ecosystem

### Phase 3 (Future)
- Multi-tenancy support
- Advanced analytics
- Machine learning integration
- Mobile applications
- Desktop applications
- Enterprise features

## Conclusion

This development guide provides comprehensive documentation for building applications with YLStack. The platform offers a robust foundation for creating scalable, secure, and maintainable applications with:

- **Flexible configuration** - YAML/JSON with environment overrides
- **Powerful database abstraction** - SQLite/PostgreSQL with Drizzle ORM
- **Comprehensive API layer** - Hono framework with middleware pipeline
- **Secure authentication** - JWT tokens with RBAC
- **Modern admin dashboard** - SvelteKit SPA with responsive design
- **Extensible plugin system** - Modular architecture with lifecycle hooks

By following the patterns and best practices outlined in this guide, you can build production-ready applications that are scalable, maintainable, and secure.