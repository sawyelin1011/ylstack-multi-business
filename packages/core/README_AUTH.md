# Authentication & Authorization System

The YLStack authentication system provides comprehensive JWT-based authentication with user management, sessions, and role-based access control (RBAC).

## Features

- **User Management**: Create, update, delete, and list users
- **JWT Authentication**: Access tokens (15min) and refresh tokens (7 days)
- **Session Management**: Track user sessions with metadata
- **RBAC**: Role-based permissions (admin, editor, viewer, user)
- **Password Validation**: Configurable password strength requirements
- **Audit Logging**: Track all authentication events

## Installation

Dependencies are included in `@ylstack/core`:

```bash
bun add @ylstack/core
```

## Quick Start

```typescript
import {
  createUser,
  generateTokenPair,
  verifyAccessToken,
} from '@ylstack/core';

// Create a user
const user = await createUser({
  email: 'user@example.com',
  name: 'John Doe',
  password: 'SecurePass123!',
  role: 'user',
});

// Generate tokens
const tokens = await generateTokenPair(user.id, {
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});

// Verify token
const payload = await verifyAccessToken(tokens.accessToken);
```

## Configuration

Set the JWT secret in your environment:

```bash
# .env
JWT_SECRET=your-secret-key-at-least-32-characters-long
```

## Password Requirements

Default password policy:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*...)

Customize via configuration:

```typescript
import { validatePasswordStrength } from '@ylstack/core';

const result = validatePasswordStrength('password123', {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
});
```

## API Endpoints

All endpoints return standardized `ApiResponse` format.

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout current session
- `POST /auth/logout-all` - Logout all sessions
- `GET /auth/me` - Get current user

### User Management

- `GET /api/users` - List users with pagination
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Middleware

### Authentication Middleware

```typescript
import { requireAuth, optionalAuth } from '@ylstack/core';

// Require authentication
app.use('/protected', requireAuth());

// Optional authentication
app.use('/public', optionalAuth());
```

### Authorization Middleware

```typescript
import {
  requireRole,
  requirePermission,
  requireSelfOrAdmin,
} from '@ylstack/core';

// Require specific role
app.use('/admin', requireRole('admin'));

// Require specific permission
app.use('/content', requirePermission('content.create'));

// User can access own resources or admin
app.use('/users/:id', requireSelfOrAdmin());
```

## RBAC System

### Default Roles

- **admin**: Full access to all resources
- **editor**: Can create/edit content
- **viewer**: Read-only access
- **user**: Basic profile management

### Checking Permissions

```typescript
import { hasPermission, hasRole } from '@ylstack/core';

// Check role
const isAdmin = await hasRole(userId, 'admin');

// Check permission
const canDelete = await hasPermission(userId, 'users.delete');
```

### Defining Permissions

```typescript
import { definePermission } from '@ylstack/core';

definePermission('custom.permission', ['admin', 'editor']);
```

## Session Management

### Creating Sessions

```typescript
import { createSession } from '@ylstack/core';

const session = await createSession(userId, {
  userAgent: req.headers['user-agent'],
  ipAddress: req.ip,
});
```

### Session Lifecycle

- Sessions expire after 24 hours
- Refresh extends session duration
- Revoke ends specific session
- Revoke all ends all user sessions

## Token Management

### Token Lifecycle

1. **Login**: Generate access + refresh tokens
2. **Access Token**: 15 minute expiry, used for API calls
3. **Refresh Token**: 7 day expiry, used to get new access token
4. **Token Refresh**: Exchange refresh token for new access token
5. **Revocation**: Invalidate tokens on logout

### Token Usage

```typescript
// Include in Authorization header
headers: {
  'Authorization': 'Bearer <access_token>'
}
```

## Audit Logging

All authentication events are logged:

```typescript
import { logAuthEvent } from '@ylstack/core';

await logAuthEvent({
  userId: user.id,
  eventType: 'login',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  success: true,
});
```

### Event Types

- `register` - User registration
- `login` - User login
- `logout` - User logout
- `password_change` - Password changed
- `token_generated` - Token created
- `session_created` - Session created
- `session_revoked` - Session ended
- `all_sessions_revoked` - All sessions ended
- `token_refresh` - Token refreshed
- `token_revoked` - Token invalidated

## Error Handling

```typescript
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
  SessionExpiredError,
  InvalidTokenError,
  PasswordTooWeakError,
} from '@ylstack/core';

try {
  await createUser({...});
} catch (error) {
  if (error instanceof UserAlreadyExistsError) {
    // Handle duplicate user
  } else if (error instanceof PasswordTooWeakError) {
    // Handle weak password
  }
}
```

## Security Best Practices

1. **Never hardcode secrets** - Use environment variables
2. **Use HTTPS** - Always in production
3. **Rotate secrets** - Regularly update JWT_SECRET
4. **Implement rate limiting** - Prevent brute force attacks
5. **Monitor audit logs** - Review authentication events
6. **Use strong passwords** - Enforce password policies
7. **Implement 2FA** - For sensitive operations
8. **Session timeout** - Automatically expire inactive sessions

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { createUser, validatePassword } from '@ylstack/core';

describe('User Service', () => {
  it('should create user', async () => {
    const user = await createUser({
      email: 'test@example.com',
      password: 'SecurePass123!',
    });
    expect(user.email).toBe('test@example.com');
  });
});
```

## Migration Guide

If migrating from another auth system:

1. Export existing users and passwords
2. Re-hash passwords with bcrypt (YLSStack uses bcrypt)
3. Import users with new password hashes
4. Update any existing token references
5. Implement session management
6. Set up audit logging

## Support

For issues or questions, refer to the main README or open an issue.
