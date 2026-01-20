/**
 * API Server Creation
 * Main server setup with middleware pipeline and route registration
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { getConfig, getServerConfig, getDatabaseConfig } from '../config';
import { initializeDb, getDb } from '../db';
import { createLogger } from '../logger';
import { ApiRouter } from './router';
import { 
  requestIdMiddleware, 
  loggerMiddleware, 
  timingMiddleware, 
  securityMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
  errorHandlerMiddleware
} from './middleware';
import { successResponse } from './responses';

// Server creation function
export function createApiServer(config?: any): Hono {
  // Use provided config or load from config system
  const appConfig = config || getConfig();
  const serverConfig = getServerConfig();
  
  // Initialize logger
  const logger = createLogger({
    service: 'ylstack-api',
    version: '1.0.0',
  });
  
  // Initialize database
  const db = initializeDb(appConfig);
  logger.info('Database initialized');
  
  // Create Hono app
  const app = new Hono();
  
  // Add middleware in the correct order (CRITICAL)
  
  // 1. Request ID (first, needed by all)
  app.use('*', requestIdMiddleware);
  
  // 2. Logger (log all requests)
  app.use('*', loggerMiddleware);
  
  // 3. Timing (measure duration)
  app.use('*', timingMiddleware);
  
  // 4. Security headers
  app.use('*', securityMiddleware);
  
  // 5. CORS
  app.use('*', corsMiddleware);
  
  // 6. Rate limiting
  app.use('*', rateLimitMiddleware);
  
  // 7. Error handler (last, catches all)
  app.use('*', errorHandlerMiddleware);
  
  // Health check endpoints
  setupHealthEndpoints(app, logger);
  
  // API info endpoint
  setupApiInfoEndpoints(app, logger);
  
  // Example routes
  setupExampleRoutes(app);
  
  logger.info('API server initialized successfully', {
    port: serverConfig.port || 3000,
    host: serverConfig.host || '0.0.0.0',
    middleware: ['requestId', 'logger', 'timing', 'security', 'cors', 'rateLimit', 'errorHandler'],
  });
  
  return app;
}

/**
 * Setup health check endpoints
 */
function setupHealthEndpoints(app: Hono, logger: any): void {
  // Basic health check
  app.get('/health', async (ctx) => {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: {
          status: 'up' as const,
          timestamp: new Date().toISOString(),
        },
        config: {
          status: 'up' as const,
          timestamp: new Date().toISOString(),
        },
        memory: {
          status: 'up' as const,
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
        },
      },
    };
    
    return successResponse(healthData);
  });
  
  // Readiness check
  app.get('/ready', async (ctx) => {
    const readinessData = {
      status: 'ready' as const,
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: 'ready' as const,
          timestamp: new Date().toISOString(),
        },
        dependencies: {
          status: 'ready' as const,
          timestamp: new Date().toISOString(),
          services: {
            config: 'ready',
            logger: 'ready',
          },
        },
      },
    };
    
    return successResponse(readinessData);
  });
  
  // Liveness check
  app.get('/live', async (ctx) => {
    const livenessData = {
      status: 'alive' as const,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
    
    return successResponse(livenessData);
  });
}

/**
 * Setup API information endpoints
 */
function setupApiInfoEndpoints(app: Hono, logger: any): void {
  // API version endpoint
  app.get('/version', async (ctx) => {
    const versionData = {
      version: '1.0.0',
      build: process.env.BUILD_SHA || 'development',
      environment: process.env.NODE_ENV || 'development',
      runtime: 'Node.js',
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      timestamp: new Date().toISOString(),
    };
    
    return successResponse(versionData);
  });
  
  // API info endpoint
  app.get('/api', async (ctx) => {
    const serverConfig = getServerConfig();
    
    const apiInfo = {
      name: 'YLStack API',
      version: '1.0.0',
      description: 'Universal Platform Engine API',
      environment: process.env.NODE_ENV || 'development',
      server: {
        host: serverConfig.host || '0.0.0.0',
        port: serverConfig.port || 3000,
        protocol: serverConfig.protocol || 'http',
      },
      documentation: '/docs',
      endpoints: {
        health: '/health',
        ready: '/ready',
        live: '/live',
        version: '/version',
      },
      timestamp: new Date().toISOString(),
    };
    
    return successResponse(apiInfo);
  });
}

/**
 * Setup example routes for demonstration
 */
function setupExampleRoutes(app: Hono): void {
  // Simple GET endpoint
  app.get('/api/hello', async (ctx) => {
    const greeting = {
      message: 'Hello from YLStack API!',
      timestamp: new Date().toISOString(),
    };
    
    return successResponse(greeting);
  });
  
  // GET endpoint with validation
  app.get('/api/users/:id', async (ctx) => {
    const userId = ctx.req.param('id');
    
    // Mock user data
    const user = {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date().toISOString(),
    };
    
    return successResponse(user);
  });
}

/**
 * Start the API server
 */
export async function startServer(
  options: {
    port?: number;
    host?: string;
    config?: any;
  } = {}
): Promise<{
  app: Hono;
  server: any;
  logger: any;
}> {
  const { port, host, config } = options;
  
  // Create server
  const app = createApiServer(config);
  
  // Use provided port/host or config
  const serverConfig = getServerConfig();
  const serverPort = port || serverConfig.port || 3000;
  const serverHost = host || serverConfig.host || '0.0.0.0';
  
  // Get logger from server
  const logger = createLogger({ service: 'ylstack-api' });
  
  logger.info('Starting YLStack API server', {
    port: serverPort,
    host: serverHost,
    environment: process.env.NODE_ENV || 'development',
  });
  
  // Start server
  const server = Bun.serve({
    port: serverPort,
    hostname: serverHost,
    fetch: app.fetch,
    error: (error) => {
      logger.error('Server error', error);
      return new Response('Internal Server Error', { status: 500 });
    },
  });
  
  logger.info(`YLStack API server started successfully`, {
    port: serverPort,
    host: serverHost,
    url: `http://${serverHost}:${serverPort}`,
    docs: `http://${serverHost}:${serverPort}/api`,
  });
  
  return { app, server, logger };
}

/**
 * Stop the server gracefully
 */
export async function stopServer(server: any, logger?: any): Promise<void> {
  if (logger) {
    logger.info('Shutting down YLStack API server...');
  }
  
  try {
    await server.stop();
    
    if (logger) {
      logger.info('YLStack API server stopped successfully');
    }
  } catch (error) {
    if (logger) {
      logger.error('Error stopping server', error);
    }
    throw error;
  }
}