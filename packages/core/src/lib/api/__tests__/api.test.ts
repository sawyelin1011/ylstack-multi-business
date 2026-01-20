/**
 * Comprehensive API Layer Tests
 * Tests for the complete API layer including server, middleware, routing, and validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApiServer } from '../server';
import { ApiRouter } from '../router';
import { 
  requestIdMiddleware, 
  loggerMiddleware, 
  timingMiddleware, 
  securityMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
  errorHandlerMiddleware 
} from '../middleware';
import { 
  validateBody, 
  validateQuery, 
  validateParams,
  CommonSchemas
} from '../validation';
import { 
  ValidationError, 
  NotFoundError, 
  UnauthorizedError, 
  ForbiddenError, 
  InternalError 
} from '../errors';
import { 
  successResponse, 
  errorResponse, 
  createdResponse 
} from '../responses';
import { ContextUtils, ContextFactory } from '../context';
import { createLogger } from '../../logger';
import { z } from 'zod';

// Mock the config and db modules
vi.mock('../config', () => ({
  getConfig: vi.fn(() => ({
    server: {
      port: 3000,
      host: '0.0.0.0',
      cors: {
        enabled: true,
        origin: '*',
        methods: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        headers: 'Content-Type, Authorization, X-Request-ID',
        credentials: false,
      },
      rateLimit: {
        enabled: true,
        windowMs: 15 * 60 * 1000,
        maxRequests: 100,
      },
      security: {
        strictTransportSecurity: true,
        contentTypeOptions: true,
        frameOptions: 'DENY',
        xssProtection: true,
        referrerPolicy: 'strict-origin-when-cross-origin',
      },
    },
    database: {
      url: 'sqlite:memory:',
    },
  })),
  getServerConfig: vi.fn(() => ({
    port: 3000,
    host: '0.0.0.0',
    cors: {
      enabled: true,
      origin: '*',
      methods: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      headers: 'Content-Type, Authorization, X-Request-ID',
      credentials: false,
    },
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
    },
    security: {
      strictTransportSecurity: true,
      contentTypeOptions: true,
      frameOptions: 'DENY',
      xssProtection: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
    },
  })),
}));

vi.mock('../db', () => ({
  initializeDb: vi.fn(() => ({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })),
  getDb: vi.fn(() => ({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Helper function to create a mock Hono context
function createMockContext(
  method: string = 'GET',
  url: string = 'http://localhost:3000/test',
  body?: any,
  headers?: Record<string, string>
) {
  const mockRequest = new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'test-agent',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const context = {
    req: {
      method,
      url,
      path: '/test',
      query: () => ({}),
      param: () => ({}),
      json: async () => body || {},
      headers: mockRequest.headers,
      header: (name: string) => mockRequest.headers.get(name) || '',
    },
    res: new Response(),
    set: vi.fn(),
    get: vi.fn(),
    header: vi.fn(),
    status: vi.fn(() => context),
    json: vi.fn((data) => {
      context.res = new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      return context.res;
    }),
    text: vi.fn((text) => {
      context.res = new Response(text, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
      return context.res;
    }),
  };

  return context;
}

describe('API Server', () => {
  describe('Server Initialization', () => {
    it('should initialize server with config', () => {
      const app = createApiServer();
      expect(app).toBeDefined();
      expect(typeof app.fetch).toBe('function');
    });

    it('should create server and register health endpoint', async () => {
      const app = createApiServer();
      const request = new Request('http://localhost:3000/health');
      const response = await app.fetch(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('status', 'healthy');
      expect(data.data).toHaveProperty('uptime');
      expect(data.data).toHaveProperty('checks');
    });

    it('should register ready endpoint that validates dependencies', async () => {
      const app = createApiServer();
      const request = new Request('http://localhost:3000/ready');
      const response = await app.fetch(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('status', 'ready');
      expect(data.data).toHaveProperty('checks');
    });
  });

  describe('Middleware Pipeline', () => {
    it('should generate request ID and include in response', async () => {
      const app = createApiServer();
      const request = new Request('http://localhost:3000/health');
      const response = await app.fetch(request);
      
      expect(response.headers.has('X-Request-ID')).toBe(true);
      expect(response.headers.get('X-Request-ID')).toMatch(/^[0-9a-f-]+$/);
    });

    it('should measure response time and include in headers', async () => {
      const app = createApiServer();
      const request = new Request('http://localhost:3000/health');
      const response = await app.fetch(request);
      
      expect(response.headers.has('X-Response-Time')).toBe(true);
      const duration = parseInt(response.headers.get('X-Response-Time') || '0');
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should be fast
    });

    it('should add security headers to all responses', async () => {
      const app = createApiServer();
      const request = new Request('http://localhost:3000/health');
      const response = await app.fetch(request);
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.has('Strict-Transport-Security')).toBe(true);
    });

    it('should apply CORS headers', async () => {
      const app = createApiServer();
      const request = new Request('http://localhost:3000/health', {
        headers: { 'Origin': 'http://example.com' }
      });
      const response = await app.fetch(request);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
    });

    it('should handle CORS preflight requests', async () => {
      const app = createApiServer();
      const request = new Request('http://localhost:3000/health', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://example.com',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      const response = await app.fetch(request);
      
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://example.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
    });

    it('should handle rate limiting', async () => {
      const app = createApiServer();
      
      // Make multiple requests quickly
      const requests = Array(10).fill(null).map(() => 
        app.fetch(new Request('http://localhost:3000/health'))
      );
      
      const responses = await Promise.all(requests);
      
      // Most should succeed, some might be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      const successful = responses.filter(r => r.status === 200);
      
      expect(successful.length + rateLimited.length).toBe(10);
      
      // Check rate limit headers on rate limited responses
      for (const response of rateLimited) {
        expect(response.headers.has('Retry-After')).toBe(true);
        expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
      }
    });

    it('should log requests and responses', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      
      vi.spyOn(console, 'info').mockImplementation(mockLogger.info);
      vi.spyOn(console, 'warn').mockImplementation(mockLogger.warn);
      vi.spyOn(console, 'error').mockImplementation(mockLogger.error);
      
      const app = createApiServer();
      const request = new Request('http://localhost:3000/health');
      await app.fetch(request);
      
      // Check that logging occurred
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should catch and handle errors', async () => {
      const app = createApiServer();
      const request = new Request('http://localhost:3000/nonexistent');
      const response = await app.fetch(request);
      
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('Error Handling', () => {
    it('should handle ValidationError correctly', async () => {
      const mockError = new ValidationError('Invalid input', {
        fields: { email: ['Invalid email format'] }
      });
      
      const errorResponse = errorResponse(mockError);
      expect(errorResponse.error?.code).toBe('VALIDATION_ERROR');
      expect(errorResponse.error?.message).toBe('Invalid input');
      expect(errorResponse.error?.context?.fields).toEqual({ email: ['Invalid email format'] });
    });

    it('should handle NotFoundError correctly', async () => {
      const mockError = new NotFoundError('User', { userId: '123' });
      
      const response = errorResponse(mockError);
      expect(response.error?.code).toBe('NOT_FOUND');
      expect(response.error?.message).toBe('User not found');
      expect(response.error?.context?.resourceId).toBe('123');
    });

    it('should handle UnauthorizedError correctly', async () => {
      const mockError = new UnauthorizedError('Token expired');
      
      const response = errorResponse(mockError);
      expect(response.error?.code).toBe('UNAUTHORIZED');
      expect(response.error?.message).toBe('Token expired');
    });

    it('should handle ForbiddenError correctly', async () => {
      const mockError = new ForbiddenError('Insufficient permissions', {
        required: 'admin',
        user: { roles: ['user'] }
      });
      
      const response = errorResponse(mockError);
      expect(response.error?.code).toBe('FORBIDDEN');
      expect(response.error?.message).toBe('Insufficient permissions');
      expect(response.error?.context?.required).toBe('admin');
    });

    it('should handle InternalError correctly', async () => {
      const mockError = new InternalError('Database connection failed', {
        operation: 'connect'
      });
      
      const response = errorResponse(mockError);
      expect(response.error?.code).toBe('INTERNAL_ERROR');
      expect(response.error?.message).toBe('Database connection failed');
      expect(response.error?.context?.operation).toBe('connect');
    });

    it('should sanitize errors in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const unexpectedError = new Error('Sensitive database password: secret123');
      const response = errorResponse(unexpectedError);
      
      // In production, unexpected errors should be sanitized
      expect(response.error?.message).not.toContain('password');
      expect(response.error?.message).not.toContain('secret');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Response Format', () => {
    it('should create success response with correct format', () => {
      const response = successResponse({ message: 'Hello' }, { requestId: 'test-123' });
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ message: 'Hello' });
      expect(response.meta).toHaveProperty('timestamp');
      expect(response.meta.requestId).toBe('test-123');
    });

    it('should create error response with correct format', () => {
      const error = new ValidationError('Invalid data');
      const response = errorResponse(error, { requestId: 'test-456' });
      
      expect(response.success).toBe(false);
      expect(response.data).toBeNull();
      expect(response.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.error).toHaveProperty('message', 'Invalid data');
      expect(response.meta.requestId).toBe('test-456');
    });

    it('should include timestamp and requestId in all responses', () => {
      const response = successResponse({ test: 'data' }, { requestId: 'test-789' });
      
      expect(response.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(response.meta.requestId).toBe('test-789');
    });
  });

  describe('Route Registration', () => {
    it('should register routes correctly', () => {
      const router = new ApiRouter();
      
      router.get('/test', async () => new Response('OK'));
      router.post('/users', async () => new Response('Created'));
      router.put('/users/:id', async () => new Response('Updated'));
      
      const routes = router.getRoutes();
      
      expect(routes).toHaveLength(3);
      expect(routes[0]).toHaveProperty('method', 'GET');
      expect(routes[0]).toHaveProperty('path', '/test');
      expect(routes[1]).toHaveProperty('method', 'POST');
      expect(routes[1]).toHaveProperty('path', '/users');
      expect(routes[2]).toHaveProperty('method', 'PUT');
      expect(routes[2]).toHaveProperty('path', '/users/:id');
    });

    it('should support route discovery and filtering', () => {
      const router = new ApiRouter();
      
      router.get('/public', async () => new Response('OK'), { tags: ['public'] });
      router.get('/admin', async () => new Response('OK'), { tags: ['admin'] });
      router.post('/users', async () => new Response('OK'), { tags: ['users'] });
      
      const publicRoutes = router.getRoutesByTag('public');
      const adminRoutes = router.getRoutesByTag('admin');
      const allRoutes = router.getRoutes();
      
      expect(publicRoutes).toHaveLength(1);
      expect(publicRoutes[0].path).toBe('/public');
      expect(adminRoutes).toHaveLength(1);
      expect(adminRoutes[0].path).toBe('/admin');
      expect(allRoutes).toHaveLength(3);
    });
  });

  describe('Request Validation', () => {
    it('should validate request body correctly', async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });
      
      const middleware = validateBody(schema);
      const ctx = createMockContext('POST', 'http://localhost:3000/users', {
        name: 'John',
        email: 'john@example.com'
      });
      
      let error = null;
      try {
        await middleware(ctx, async () => {});
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeNull();
      expect(ctx.set).toHaveBeenCalledWith('validatedBody', {
        name: 'John',
        email: 'john@example.com'
      });
    });

    it('should return 400 for invalid request body', async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });
      
      const middleware = validateBody(schema);
      const ctx = createMockContext('POST', 'http://localhost:3000/users', {
        name: '', // Invalid: empty string
        email: 'invalid-email' // Invalid: not an email
      });
      
      let error = null;
      try {
        await middleware(ctx, async () => {});
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(400);
      expect(error.context?.fields).toBeDefined();
    });

    it('should validate query parameters correctly', async () => {
      const schema = CommonSchemas.pagination;
      
      const middleware = validateQuery(schema);
      const ctx = createMockContext('GET', 'http://localhost:3000/users?page=2&limit=10');
      
      let error = null;
      try {
        await middleware(ctx, async () => {});
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeNull();
      expect(ctx.set).toHaveBeenCalledWith('validatedQuery', {
        page: 2,
        limit: 10
      });
    });
  });

  describe('Context Utilities', () => {
    it('should provide context helpers', () => {
      const mockContext = {
        get: vi.fn((key) => {
          const data = {
            user: { id: '123', email: 'test@example.com' },
            db: { select: vi.fn() },
            logger: { info: vi.fn() },
            requestId: 'test-123',
            startTime: Date.now(),
          };
          return data[key];
        }),
      };
      
      expect(ContextUtils.isAuthenticated(mockContext as any)).toBe(true);
      expect(ContextUtils.hasRole(mockContext as any, 'user')).toBe(false);
      expect(ContextUtils.getRequestId(mockContext as any)).toBe('test-123');
    });

    it('should create child logger with context', () => {
      const parentLogger = createLogger({ service: 'api' });
      const childLogger = parentLogger.child({ route: '/users' });
      
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });
  });
});

// Integration tests for the complete API layer
describe('API Integration Tests', () => {
  let app: any;

  beforeEach(() => {
    app = createApiServer();
  });

  it('should handle complete request flow', async () => {
    const request = new Request('http://localhost:3000/health');
    const response = await app.fetch(request);
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('healthy');
    expect(response.headers.has('X-Request-ID')).toBe(true);
    expect(response.headers.has('X-Response-Time')).toBe(true);
    expect(response.headers.has('X-Content-Type-Options')).toBe(true);
  });

  it('should handle 404 for unknown routes', async () => {
    const request = new Request('http://localhost:3000/unknown-route');
    const response = await app.fetch(request);
    
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('should handle version endpoint', async () => {
    const request = new Request('http://localhost:3000/version');
    const response = await app.fetch(request);
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('version');
    expect(data.data).toHaveProperty('node');
    expect(data.data).toHaveProperty('platform');
  });

  it('should handle API info endpoint', async () => {
    const request = new Request('http://localhost:3000/api');
    const response = await app.fetch(request);
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('name', 'YLStack API');
    expect(data.data).toHaveProperty('endpoints');
  });
});