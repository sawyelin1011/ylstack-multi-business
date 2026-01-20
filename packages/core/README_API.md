# YLStack API Layer Documentation

The YLStack API layer provides a production-ready HTTP API foundation built with Hono framework, comprehensive middleware pipeline, and type-safe route registration system.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Core Components](#core-components)
- [Middleware System](#middleware-system)
- [Request Validation](#request-validation)
- [Error Handling](#error-handling)
- [Response Format](#response-format)
- [Context and Logger](#context-and-logger)
- [Route Registration](#route-registration)
- [Security Features](#security-features)
- [Health Checks](#health-checks)
- [Configuration](#configuration)
- [Examples](#examples)
- [Testing](#testing)

## Architecture Overview

The API layer follows a modular architecture with clear separation of concerns:

```
┌─────────────────┐
│   HTTP Request  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Middleware      │
│ Pipeline        │
├─────────────────┤
│ 1. Request ID  │
│ 2. Logger       │
│ 3. Timing       │
│ 4. Security     │
│ 5. CORS         │
│ 6. Rate Limit   │
│ 7. Validation   │
│ 8. Error Handler│
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Route Handler   │
│ (Business Logic)│
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Standardized    │
│ Response        │
└─────────────────┘
```

### Key Principles

- **Production Ready**: No placeholders, comprehensive error handling
- **Type Safety**: Full TypeScript strict mode compliance
- **Security First**: Security headers, CORS, rate limiting built-in
- **Observability**: Request tracking, logging, performance monitoring
- **Standards Compliant**: RESTful patterns, standard HTTP status codes

## Quick Start

### Basic Server Setup

```typescript
import { createApiServer } from '@ylstack/core';

// Create and start the server
const app = createApiServer();

// Or with custom config
const app = createApiServer({
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});
```

### Simple Route

```typescript
import { createApiServer, successResponse } from '@ylstack/core';

const app = createApiServer();

// Add a route
app.get('/api/hello', async (ctx) => {
  return successResponse({
    message: 'Hello from YLStack API!',
    timestamp: new Date().toISOString()
  });
});
```

### Route with Validation

```typescript
import { createApiServer, validateBody, successResponse, CommonSchemas } from '@ylstack/core';

const app = createApiServer();

// Create user schema
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

app.post('/api/users', 
  validateBody(createUserSchema),
  async (ctx) => {
    const validated = ctx.get('validatedBody');
    
    // validated contains: { name: string, email: string }
    
    return successResponse({
      id: '123',
      ...validated,
      createdAt: new Date().toISOString()
    });
  }
);
```

## Core Components

### 1. Logger System

The logger provides structured logging with context support:

```typescript
import { createLogger, createRequestLogger } from '@ylstack/core';

// Create a basic logger
const logger = createLogger({ service: 'api' });

// Create request-specific logger
const requestLogger = createRequestLogger('req-123', {
  userId: 'user-456',
  endpoint: '/api/users'
});

logger.info('Application started');
requestLogger.info('Processing request', { duration: 100 });
```

**Features:**
- Structured logging with context
- Request ID tracking
- Severity levels (debug, info, warn, error)
- Child loggers for context
- Async-safe for tests

### 2. Error Classes

Comprehensive error types with proper HTTP status codes:

```typescript
import { 
  ValidationError, 
  NotFoundError, 
  UnauthorizedError,
  ForbiddenError,
  InternalError
} from '@ylstack/core';

// Validation error (400)
throw new ValidationError('Invalid email format', {
  fields: { email: ['Must be a valid email'] }
});

// Not found (404)
throw new NotFoundError('User', { userId: '123' });

// Unauthorized (401)
throw new UnauthorizedError('Authentication required');

// Forbidden (403)
throw new ForbiddenError('Insufficient permissions', {
  required: 'admin',
  user: { roles: ['user'] }
});

// Internal error (500)
throw new InternalError('Database connection failed', {
  operation: 'connect'
});
```

### 3. Response Standardization

All responses follow a consistent format:

```typescript
import { successResponse, errorResponse, createdResponse } from '@ylstack/core';

// Success response
const response = successResponse({
  user: { id: '123', name: 'John' }
});

// Created response (201)
const created = createdResponse({
  user: { id: '456', name: 'Jane' }
});

// Error response
const error = errorResponse(new ValidationError('Invalid data'));
```

**Response Format:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "meta": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## Middleware System

The API layer includes a comprehensive middleware pipeline in the correct order:

### 1. Request ID Middleware

Generates and tracks unique request IDs:

```typescript
import { requestIdMiddleware, getRequestId } from '@ylstack/core';

// Get request ID in handler
app.get('/api/test', async (ctx) => {
  const requestId = getRequestId(ctx);
  return successResponse({ requestId });
});
```

### 2. Logger Middleware

Logs all requests and responses:

```typescript
import { loggerMiddleware } from '@ylstack/core';

// Request/response logging
app.use('*', loggerMiddleware);
```

### 3. Timing Middleware

Measures request duration:

```typescript
import { timingMiddleware, getRequestDuration } from '@ylstack/core';

app.get('/api/test', async (ctx) => {
  const duration = getRequestDuration(ctx);
  return successResponse({ duration });
});
```

### 4. Security Middleware

Adds comprehensive security headers:

```typescript
import { securityMiddleware } from '@ylstack/core';

app.use('*', securityMiddleware);
```

**Headers added:**
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy`

### 5. CORS Middleware

Handles Cross-Origin Resource Sharing:

```typescript
import { corsMiddleware } from '@ylstack/core';

app.use('*', corsMiddleware);
```

### 6. Rate Limiting

Prevents API abuse:

```typescript
import { rateLimitMiddleware } from '@ylstack/core';

app.use('*', rateLimitMiddleware);
```

### 7. Error Handler

Global error handling:

```typescript
import { errorHandlerMiddleware } from '@ylstack/core';

app.use('*', errorHandlerMiddleware);
```

## Request Validation

### Body Validation

```typescript
import { validateBody, z } from '@ylstack/core';

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().optional()
});

app.post('/api/users', 
  validateBody(userSchema),
  async (ctx) => {
    const user = ctx.get('validatedBody');
    // user is typed as: { name: string, email: string, age?: number }
    
    return successResponse({ user });
  }
);
```

### Query Validation

```typescript
import { validateQuery } from '@ylstack/core';

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

app.get('/api/users',
  validateQuery(paginationSchema),
  async (ctx) => {
    const { page, limit } = ctx.get('validatedQuery');
    return successResponse({ page, limit });
  }
);
```

### Path Parameter Validation

```typescript
import { validateParams } from '@ylstack/core';

const paramsSchema = z.object({
  id: z.string().uuid()
});

app.get('/api/users/:id',
  validateParams(paramsSchema),
  async (ctx) => {
    const { id } = ctx.get('validatedParams');
    return successResponse({ userId: id });
  }
);
```

### Combined Validation

```typescript
import { validate } from '@ylstack/core';

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
    
    return successResponse({ body, query, params });
  }
);
```

## Error Handling

### Custom Error Handler

```typescript
import { createErrorHandlerMiddleware } from '@ylstack/core';

const customErrorHandler = createErrorHandlerMiddleware({
  includeStackTrace: false,
  logErrors: true,
  onError: (error, ctx) => {
    // Custom error handling logic
    console.log(`Error in ${ctx.req.path}:`, error.message);
  }
});

app.use('*', customErrorHandler);
```

### Error Context

```typescript
import { ErrorHandler } from '@ylstack/core';

const errorHandler = new ErrorHandler();

// Handle error with context
const response = errorHandler.handle(error, {
  requestId: 'req-123',
  method: 'POST',
  path: '/api/users',
  userId: 'user-456'
});
```

## Response Format

### Success Response

```typescript
const response = successResponse(data, {
  requestId: 'req-123',
  duration: 150
});
```

### Error Response

```typescript
const error = new ValidationError('Invalid input', {
  fields: { email: ['Invalid email'] }
});

const response = errorResponse(error, {
  requestId: 'req-123'
});
```

### Paginated Response

```typescript
import { paginatedResponse } from '@ylstack/core';

const response = paginatedResponse(users, {
  page: 1,
  limit: 20,
  total: 100,
  totalPages: 5
});
```

### No Content Response

```typescript
import { noContentResponse } from '@ylstack/core';

const response = noContentResponse({
  requestId: 'req-123',
  duration: 50
});
```

## Context and Logger

### Application Context

```typescript
import { AppContext, ContextUtils } from '@ylstack/core';

// Access context in handler
app.get('/api/users/:id', async (ctx) => {
  // Database
  const db = ContextUtils.getDatabase(ctx);
  
  // Logger
  const logger = ContextUtils.getLogger(ctx);
  logger.info('Fetching user', { userId: id });
  
  // Request ID
  const requestId = ContextUtils.getRequestId(ctx);
  
  // User (if authenticated)
  const user = ContextUtils.getUser(ctx);
  if (user) {
    logger.info('Request by authenticated user', { userId: user.id });
  }
  
  return successResponse({ id });
});
```

### User Context

```typescript
// Check authentication
if (!ContextUtils.isAuthenticated(ctx)) {
  throw new UnauthorizedError('Authentication required');
}

// Check roles
if (!ContextUtils.hasRole(ctx, 'admin')) {
  throw new ForbiddenError('Admin role required');
}

// Check permissions
if (!ContextUtils.hasPermission(ctx, 'users:read')) {
  throw new ForbiddenError('users:read permission required');
}
```

### Child Logger

```typescript
const childLogger = ContextUtils.createChildLogger(ctx, {
  operation: 'createUser',
  userId: '123'
});

childLogger.info('Creating new user', { email: 'user@example.com' });
```

## Route Registration

### Using ApiRouter

```typescript
import { ApiRouter } from '@ylstack/core';

const router = new ApiRouter();

// Register routes
router.get('/users', async (ctx) => {
  return successResponse({ users: [] });
});

router.post('/users', 
  validateBody(userSchema),
  async (ctx) => {
    const user = ctx.get('validatedBody');
    return successResponse(user, { status: 201 });
  }
);

// Get registered routes
const routes = router.getRoutes();
```

### Route Options

```typescript
router.get('/admin/users', async (ctx) => {
  return successResponse({ users: [] });
}, {
  tags: ['admin', 'users'],
  description: 'Get all users (admin only)',
  auth: 'required',
  roles: ['admin'],
  permissions: ['users:read'],
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 10
  }
});
```

### Route Groups

```typescript
router.group('users', {
  prefix: '/api/users',
  middleware: [authMiddleware]
}, (userRouter) => {
  userRouter.get('/', async (ctx) => {
    return successResponse({ users: [] });
  });
  
  userRouter.get('/:id', async (ctx) => {
    const { id } = ctx.req.param();
    return successResponse({ user: { id } });
  });
});
```

## Security Features

### Security Headers

All responses include comprehensive security headers:

```typescript
// Configured security headers:
{
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'..."
}
```

### Rate Limiting

Default configuration:
- **Window**: 15 minutes
- **Max Requests**: 100 per IP
- **Headers**: Standard rate limit headers included

### CORS Configuration

Default CORS:
- **Enabled**: true
- **Origin**: * (configurable)
- **Methods**: GET, POST, PUT, DELETE, PATCH, OPTIONS
- **Headers**: Content-Type, Authorization, X-Request-ID

## Health Checks

### Basic Health Check

```bash
GET /health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "uptime": 3600,
    "checks": {
      "database": { "status": "up" },
      "config": { "status": "up" },
      "memory": {
        "status": "up",
        "used": 45,
        "total": 128,
        "percentage": 35
      }
    }
  }
}
```

### Detailed Health Check

```bash
GET /health/detailed
```

Includes:
- Database connectivity
- Memory usage
- Configuration validation
- Response time
- Overall status (healthy/degraded/unhealthy)

### Readiness Check

```bash
GET /ready
```

Verifies:
- Database readiness
- Dependency services
- Configuration validation

### Liveness Check

```bash
GET /live
```

Simple liveness probe for container orchestration.

## Configuration

### Server Configuration

```yaml
server:
  port: 3000
  host: "0.0.0.0"
  protocol: "http"
  
cors:
  enabled: true
  origin: "*"
  methods: "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  headers: "Content-Type, Authorization, X-Request-ID"
  credentials: false
  
rateLimit:
  enabled: true
  windowMs: 900000 # 15 minutes
  maxRequests: 100
  skipSuccessfulRequests: false
  skipFailedRequests: false
  
security:
  strictTransportSecurity: true
  contentTypeOptions: true
  frameOptions: "DENY"
  xssProtection: true
  referrerPolicy: "strict-origin-when-cross-origin"
```

### Environment Variables

```bash
# Server
SERVER_PORT=3000
SERVER_HOST=0.0.0.0

# CORS
CORS_ORIGIN=http://localhost:3000
CORS_METHODS=GET,POST,PUT,DELETE
CORS_HEADERS=Content-Type,Authorization

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## Examples

### Complete User Management API

```typescript
import { 
  createApiServer, 
  ApiRouter, 
  validateBody, 
  successResponse,
  createdResponse,
  ValidationError,
  NotFoundError,
  z
} from '@ylstack/core';

// User schemas
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['user', 'admin']).default('user')
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['user', 'admin']).optional()
});

const userIdSchema = z.object({
  id: z.string().uuid()
});

// Create router
const userRouter = new ApiRouter();

// GET /api/users
userRouter.get('/', 
  validateQuery(CommonSchemas.pagination),
  async (ctx) => {
    const { page, limit } = ctx.get('validatedQuery');
    
    // Mock data
    const users = [
      { id: '1', name: 'John', email: 'john@example.com', role: 'user' },
      { id: '2', name: 'Jane', email: 'jane@example.com', role: 'admin' }
    ];
    
    return paginatedResponse(users, {
      page,
      limit,
      total: 50,
      totalPages: Math.ceil(50 / limit)
    });
  }
);

// GET /api/users/:id
userRouter.get('/:id',
  validateParams(userIdSchema),
  async (ctx) => {
    const { id } = ctx.get('validatedParams');
    
    // Mock user
    const user = { id, name: 'John', email: 'john@example.com', role: 'user' };
    
    if (!user) {
      throw new NotFoundError('User', { userId: id });
    }
    
    return successResponse({ user });
  }
);

// POST /api/users
userRouter.post('/',
  validateBody(createUserSchema),
  async (ctx) => {
    const userData = ctx.get('validatedBody');
    
    // Create user logic here
    const newUser = {
      id: '123',
      ...userData,
      createdAt: new Date().toISOString()
    };
    
    return createdResponse({ user: newUser });
  }
);

// PUT /api/users/:id
userRouter.put('/:id',
  validateParams(userIdSchema),
  validateBody(updateUserSchema),
  async (ctx) => {
    const { id } = ctx.get('validatedParams');
    const updates = ctx.get('validatedBody');
    
    // Update user logic here
    const updatedUser = {
      id,
      name: updates.name || 'Updated Name',
      email: updates.email || 'updated@example.com',
      role: updates.role || 'user'
    };
    
    return successResponse({ user: updatedUser });
  }
);

// DELETE /api/users/:id
userRouter.delete('/:id',
  validateParams(userIdSchema),
  async (ctx) => {
    const { id } = ctx.get('validatedParams');
    
    // Delete user logic here
    
    return noContentResponse();
  }
);

// Create server and mount router
const app = createApiServer();

// Mount user routes
app.route('/api/users', userRouter);

// Start server
const server = Bun.serve({
  port: 3000,
  fetch: app.fetch
});
```

### Middleware Example

```typescript
import { createMiddlewarePipeline } from '@ylstack/core';

// Custom middleware
const authMiddleware = async (ctx, next) => {
  const token = ctx.req.header('authorization');
  
  if (!token) {
    throw new UnauthorizedError('Authorization token required');
  }
  
  // Verify token logic here
  const user = await verifyToken(token);
  
  // Set user in context
  ctx.set('user', user);
  
  await next();
};

const permissionMiddleware = (requiredPermission: string) => {
  return async (ctx, next) => {
    const user = ctx.get('user');
    
    if (!user?.permissions?.includes(requiredPermission)) {
      throw new ForbiddenError(`Permission '${requiredPermission}' required`);
    }
    
    await next();
  };
};

// Create custom middleware pipeline
const customPipeline = createMiddlewarePipeline([
  'requestId',
  'logger',
  'timing',
  'security',
  'cors',
  'rateLimit',
  authMiddleware,
  permissionMiddleware('users:read'),
  errorHandlerMiddleware
]);

// Apply to specific routes
app.use('/api/admin/*', customPipeline);
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createApiServer, successResponse } from '@ylstack/core';

describe('API Tests', () => {
  it('should create server', () => {
    const app = createApiServer();
    expect(app).toBeDefined();
  });
  
  it('should handle health check', async () => {
    const app = createApiServer();
    const response = await app.fetch('http://localhost:3000/health');
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('healthy');
  });
});
```

### Integration Tests

```typescript
import { createApiServer } from '@ylstack/core';

describe('User API Integration', () => {
  let app: any;
  
  beforeEach(() => {
    app = createApiServer();
    
    // Setup test routes
    app.get('/api/test', async (ctx) => {
      return successResponse({ message: 'test' });
    });
  });
  
  it('should handle complete request flow', async () => {
    const response = await app.fetch('http://localhost:3000/api/test');
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.message).toBe('test');
    expect(response.headers.has('X-Request-ID')).toBe(true);
  });
});
```

### Testing Validation

```typescript
import { validateBody } from '@ylstack/core';

describe('Validation Tests', () => {
  it('should validate request body', async () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email()
    });
    
    const middleware = validateBody(schema);
    const ctx = createMockContext('POST', 'http://localhost:3000/users', {
      name: 'John',
      email: 'john@example.com'
    });
    
    await middleware(ctx, async () => {});
    
    const validated = ctx.get('validatedBody');
    expect(validated.name).toBe('John');
    expect(validated.email).toBe('john@example.com');
  });
  
  it('should reject invalid data', async () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email()
    });
    
    const middleware = validateBody(schema);
    const ctx = createMockContext('POST', 'http://localhost:3000/users', {
      name: '', // Invalid
      email: 'invalid-email' // Invalid
    });
    
    await expect(middleware(ctx, async () => {}))
      .rejects.toThrow('VALIDATION_ERROR');
  });
});
```

---

## Summary

The YLStack API layer provides a production-ready foundation for building HTTP APIs with:

✅ **Production Ready**: Comprehensive error handling, security, logging
✅ **Type Safe**: Full TypeScript support with strict mode
✅ **Secure**: Built-in security headers, CORS, rate limiting
✅ **Observable**: Request tracking, logging, performance monitoring
✅ **Standardized**: Consistent response format and error handling
✅ **Extensible**: Modular middleware system and route registration

The API layer is designed to be the foundation for all subsequent development including authentication, admin functionality, plugin systems, and content management.