# Plugin System

The YLStack plugin system provides a modular architecture for extending platform functionality through plugins with lifecycle hooks, routes, models, services, and admin UI components.

## Architecture

### Plugin Structure

A plugin is a JavaScript/TypeScript module that exports a plugin definition:

```typescript
import type { Plugin } from '@ylstack/core';
import { createPlugin } from '@ylstack/core';

export const myPlugin: Plugin = createPlugin('my-plugin', '1.0.0')
  .metadata({
    description: 'My awesome plugin',
    author: 'Your Name',
    license: 'MIT',
  })
  .addRoute({
    path: '/api/my-plugin',
    method: 'GET',
    handler: async (c) => {
      return c.json({ message: 'Hello from plugin!' });
    },
  })
  .addHook('app:init', async (data) => {
    console.log('App initialized');
  })
  .lifecycle({
    async install(ctx) {
      ctx.logger.info('Installing plugin');
    },
    async activate(ctx) {
      ctx.logger.info('Activating plugin');
    },
    async deactivate(ctx) {
      ctx.logger.info('Deactivating plugin');
    },
    async uninstall(ctx) {
      ctx.logger.info('Uninstalling plugin');
    },
  })
  .build();
```

## Plugin Components

### 1. Routes

Define custom API endpoints:

```typescript
.addRoute({
  path: '/api/my-endpoint',
  method: 'GET',
  handler: async (c) => {
    const userId = c.get('userId');
    const db = c.get('db');
    return c.json({ data: {} });
  },
  auth: true,
  permissions: ['content.read'],
})
```

### 2. Middleware

Add request middleware:

```typescript
.addMiddleware({
  name: 'logging',
  handler: async (c, next) => {
    console.log('Request:', c.req.url);
    await next();
  },
  priority: 10,
})
```

### 3. Database Models

Define custom database tables:

```typescript
.addModel('myTable', {
  id: 'string',
  name: 'string',
  data: 'json',
  createdAt: 'timestamp',
})
```

### 4. Services

Register custom services:

```typescript
.addService('myService', () => {
  return {
    doSomething() {
      console.log('Service called');
    }
  };
})
```

### 5. Admin Pages

Add admin UI pages:

```typescript
.addAdminPage({
  path: '/admin/my-plugin',
  title: 'My Plugin',
  icon: 'Settings',
  permissions: ['admin'],
  order: 10,
})
```

### 6. Hooks

Register lifecycle hooks:

```typescript
.addHook('content:create', async (data, ctx) => {
  console.log('Content created:', data);
}, 10)
```

## Lifecycle Methods

### install

Called when plugin is first installed:

```typescript
async install(ctx: PluginContext) {
  const db = ctx.db;
  await db.schema.createTable('my_table', ...);
}
```

### activate

Called when plugin is enabled:

```typescript
async activate(ctx: PluginContext) {
  ctx.logger.info('Plugin activated');
}
```

### deactivate

Called when plugin is disabled:

```typescript
async deactivate(ctx: PluginContext) {
  ctx.logger.info('Plugin deactivated');
}
```

### uninstall

Called when plugin is removed:

```typescript
async uninstall(ctx: PluginContext) {
  const db = ctx.db;
  await db.schema.dropTable('my_table');
}
```

## Hook System

### Standard Hooks

- `app:init` - Application initialization
- `app:ready` - Application ready
- `app:shutdown` - Application shutdown
- `request:start` - Request started
- `request:end` - Request completed
- `request:error` - Request error
- `auth:register` - User registered
- `auth:login` - User logged in
- `auth:logout` - User logged out
- `auth:password_change` - Password changed
- `content:create` - Content created
- `content:update` - Content updated
- `content:delete` - Content deleted
- `content:publish` - Content published
- `plugin:install` - Plugin installed
- `plugin:activate` - Plugin activated
- `plugin:deactivate` - Plugin deactivated
- `plugin:uninstall` - Plugin uninstalled

### Registering Hooks

```typescript
import { hookSystem } from '@ylstack/core';

hookSystem.register('content:create', async (data, ctx) => {
  console.log('Content created:', data);
}, 10, 'my-plugin');
```

### Executing Hooks

```typescript
const result = await hookSystem.execute('content:create', {
  id: 'content-1',
  title: 'My Content',
});
```

## Plugin Manager

### Install Plugin

```typescript
import { installPlugin } from '@ylstack/core';

await installPlugin(myPlugin, {
  apiKey: 'secret',
});
```

### Uninstall Plugin

```typescript
import { uninstallPlugin } from '@ylstack/core';

await uninstallPlugin('my-plugin');
```

### Activate Plugin

```typescript
import { activatePlugin } from '@ylstack/core';

await activatePlugin('my-plugin');
```

### Deactivate Plugin

```typescript
import { deactivatePlugin } from '@ylstack/core';

await deactivatePlugin('my-plugin');
```

### List Plugins

```typescript
import { listAllPlugins, getActivePlugins } from '@ylstack/core';

const allPlugins = listAllPlugins();
const activePlugins = getActivePlugins();
```

## Dependencies

Plugins can depend on other plugins:

```typescript
dependencies: ['content-plugin', 'auth-plugin']
```

Dependencies are automatically activated when needed.

## Validation

Plugin validation ensures:

- Valid name format (lowercase-with-hyphens)
- Semantic versioning
- No circular dependencies
- All required fields present

```typescript
import { validatePlugin } from '@ylstack/core';

const result = validatePlugin(myPlugin);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

## Configuration

Plugins can have configuration schemas:

```typescript
config: {
  apiKey: {
    type: 'string',
    required: true,
    description: 'API key for external service',
  },
  maxRetries: {
    type: 'number',
    default: 3,
    description: 'Maximum number of retries',
  },
}
```

## Best Practices

### 1. Naming Convention

Use lowercase with hyphens:
- ✅ `my-awesome-plugin`
- ❌ `MyAwesomePlugin`
- ❌ `my_awesome_plugin`

### 2. Versioning

Follow semantic versioning:
- `1.0.0` - Major release (breaking changes)
- `1.1.0` - Minor release (new features)
- `1.1.1` - Patch release (bug fixes)

### 3. Error Handling

Always handle errors gracefully:

```typescript
async install(ctx) {
  try {
    await createTables(ctx.db);
  } catch (error) {
    ctx.logger.error('Installation failed', error);
    throw error;
  }
}
```

### 4. Cleanup

Always clean up resources on uninstall:

```typescript
async uninstall(ctx) {
  await dropTables(ctx.db);
  await cleanupFiles();
}
```

### 5. Logging

Use the provided logger:

```typescript
ctx.logger.info('Plugin started');
ctx.logger.debug('Processing data', { id: data.id });
ctx.logger.warn('Rate limit approaching');
ctx.logger.error('Operation failed', error);
```

### 6. Database Access

Use the provided database client:

```typescript
async activate(ctx) {
  const db = ctx.db;
  const { myTable } = await import('@ylstack/core/db/schema');
  const rows = await db.select().from(myTable);
}
```

## Built-in Plugins

### Hello Plugin

Simple example plugin demonstrating routing and hooks.

### Pages Plugin

Content page management with CRUD operations and admin UI.

### Forms Plugin

Form builder and submission management.

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { createPlugin } from '@ylstack/core';

describe('My Plugin', () => {
  it('should create valid plugin', () => {
    const plugin = createPlugin('test-plugin', '1.0.0')
      .lifecycle({})
      .build();

    expect(plugin.name).toBe('test-plugin');
  });
});
```

## Loading Plugins

From directory:

```typescript
import { initializePlugins } from '@ylstack/core';

await initializePlugins('./plugins');
```

From node_modules:

```typescript
import { loadFromNodeModules } from '@ylstack/core';

const result = await loadFromNodeModules('@mycompany/my-plugin');
```

## Security

### 1. Input Validation

Always validate user input:

```typescript
handler: async (c) => {
  const body = await c.req.json();
  if (!body.name) {
    return c.json({ error: 'Name required' }, 400);
  }
}
```

### 2. Permission Checks

Use authorization middleware:

```typescript
addRoute({
  path: '/api/admin',
  method: 'POST',
  handler: async (c) => {},
  auth: true,
  permissions: ['admin'],
})
```

### 3. SQL Injection Prevention

Use parameterized queries via Drizzle ORM:

```typescript
const result = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.id, userId));
```

## Troubleshooting

### Plugin Not Loading

1. Check plugin name format
2. Verify version is valid semver
3. Ensure all dependencies are installed
4. Check for circular dependencies

### Hooks Not Executing

1. Verify hook name is correct
2. Check handler is properly registered
3. Ensure plugin is activated
4. Check priority ordering

### Database Issues

1. Verify tables are created in install lifecycle
2. Check for table name conflicts
3. Ensure migrations run in correct order
4. Test queries in isolation

## Migration Guide

### From Event-Based System

If migrating from an event-based system:

1. Rename events to hooks (e.g., `user.created` → `content:create`)
2. Update hook registration syntax
3. Migrate lifecycle methods
3. Update config schema format

### From Class-Based Plugins

If migrating from class-based plugins:

1. Convert to object-based plugin definition
2. Update lifecycle method signatures
3. Migrate route definitions
4. Update hook handlers

## Support

For issues or questions, refer to the main README or open an issue.
