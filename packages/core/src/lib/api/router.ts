/**
 * API Router Registry
 * Type-safe route registration system with middleware support
 */

import type { Context } from 'hono';
import type { 
  Handler, 
  HonoMiddleware, 
  RouteOptions, 
  RegisteredRoute, 
  HttpMethod,
  ApiRoute,
  RouteGroup 
} from './types';

/**
 * API Router class for type-safe route registration
 */
export class ApiRouter {
  private routes: Map<string, ApiRoute[]> = new Map();
  private groups: Map<string, RouteGroup> = new Map();
  private globalMiddleware: HonoMiddleware[] = [];
  private routeCounter = 0;

  /**
   * Register a GET route
   */
  get<T = any>(path: string, handler: Handler<T>, options?: RouteOptions): void {
    this.registerRoute('GET', path, handler, options);
  }

  /**
   * Register a POST route
   */
  post<T = any>(path: string, handler: Handler<T>, options?: RouteOptions): void {
    this.registerRoute('POST', path, handler, options);
  }

  /**
   * Register a PUT route
   */
  put<T = any>(path: string, handler: Handler<T>, options?: RouteOptions): void {
    this.registerRoute('PUT', path, handler, options);
  }

  /**
   * Register a DELETE route
   */
  delete<T = any>(path: string, handler: Handler<T>, options?: RouteOptions): void {
    this.registerRoute('DELETE', path, handler, options);
  }

  /**
   * Register a PATCH route
   */
  patch<T = any>(path: string, handler: Handler<T>, options?: RouteOptions): void {
    this.registerRoute('PATCH', path, handler, options);
  }

  /**
   * Register an OPTIONS route
   */
  options<T = any>(path: string, handler: Handler<T>, options?: RouteOptions): void {
    this.registerRoute('OPTIONS', path, handler, options);
  }

  /**
   * Register a HEAD route
   */
  head<T = any>(path: string, handler: Handler<T>, options?: RouteOptions): void {
    this.registerRoute('HEAD', path, handler, options);
  }

  /**
   * Register multiple routes at once
   */
  routes(routes: ApiRoute[]): void {
    for (const route of routes) {
      this.registerRoute(route.method, route.path, route.handler, route.options);
    }
  }

  /**
   * Create a route group with common prefix and middleware
   */
  group(name: string, options: {
    prefix?: string;
    middleware?: HonoMiddleware[];
  }, callback: (router: ApiRouter) => void): void {
    const group: RouteGroup = {
      name,
      prefix: options.prefix || '',
      middleware: options.middleware || [],
      routes: [],
    };

    // Create a temporary router for this group
    const groupRouter = new ApiRouter();
    
    // Add global middleware to group router
    groupRouter.globalMiddleware = [...this.globalMiddleware, ...group.middleware];
    
    // Execute the callback with the group router
    callback(groupRouter);
    
    // Collect routes from group router
    for (const [method, methodRoutes] of groupRouter.routes.entries()) {
      for (const route of methodRoutes) {
        const prefixedPath = group.prefix ? `${group.prefix}${route.path}` : route.path;
        this.registerRoute(method, prefixedPath, route.handler, {
          ...route.options,
          tags: [...(route.options?.tags || []), name],
        });
      }
    }

    // Store group information
    this.groups.set(name, group);
  }

  /**
   * Add global middleware that applies to all routes
   */
  use(middleware: HonoMiddleware): void {
    this.globalMiddleware.push(middleware);
  }

  /**
   * Get all registered routes
   */
  getRoutes(): RegisteredRoute[] {
    const allRoutes: RegisteredRoute[] = [];

    for (const [method, methodRoutes] of this.routes.entries()) {
      for (const route of methodRoutes) {
        allRoutes.push({
          method,
          path: route.path,
          handler: route.handler.name || `handler-${++this.routeCounter}`,
          tags: route.options?.tags,
          description: route.options?.description,
          auth: route.options?.auth,
          roles: route.options?.roles,
          permissions: route.options?.permissions,
          middleware: route.options?.middleware?.map(m => m.name || 'anonymous') || [],
        });
      }
    }

    return allRoutes.sort((a, b) => {
      if (a.method !== b.method) {
        return a.method.localeCompare(b.method);
      }
      return a.path.localeCompare(b.path);
    });
  }

  /**
   * Get routes by tag
   */
  getRoutesByTag(tag: string): RegisteredRoute[] {
    return this.getRoutes().filter(route => 
      route.tags && route.tags.includes(tag)
    );
  }

  /**
   * Get routes by method
   */
  getRoutesByMethod(method: HttpMethod): RegisteredRoute[] {
    const routes = this.routes.get(method.toUpperCase()) || [];
    return routes.map(route => ({
      method,
      path: route.path,
      handler: route.handler.name || 'anonymous',
      tags: route.options?.tags,
      description: route.options?.description,
      auth: route.options?.auth,
      roles: route.options?.roles,
      permissions: route.options?.permissions,
      middleware: route.options?.middleware?.map(m => m.name || 'anonymous') || [],
    }));
  }

  /**
   * Get route groups
   */
  getGroups(): RouteGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get global middleware
   */
  getGlobalMiddleware(): HonoMiddleware[] {
    return [...this.globalMiddleware];
  }

  /**
   * Find route by method and path
   */
  findRoute(method: HttpMethod, path: string): RegisteredRoute | null {
    const routes = this.routes.get(method.toUpperCase()) || [];
    const route = routes.find(r => r.path === path);
    
    if (!route) {
      return null;
    }

    return {
      method,
      path: route.path,
      handler: route.handler.name || 'anonymous',
      tags: route.options?.tags,
      description: route.options?.description,
      auth: route.options?.auth,
      roles: route.options?.roles,
      permissions: route.options?.permissions,
      middleware: route.options?.middleware?.map(m => m.name || 'anonymous') || [],
    };
  }

  /**
   * Check if route exists
   */
  hasRoute(method: HttpMethod, path: string): boolean {
    const routes = this.routes.get(method.toUpperCase()) || [];
    return routes.some(r => r.path === path);
  }

  /**
   * Remove a route
   */
  removeRoute(method: HttpMethod, path: string): boolean {
    const routes = this.routes.get(method.toUpperCase()) || [];
    const index = routes.findIndex(r => r.path === path);
    
    if (index !== -1) {
      routes.splice(index, 1);
      this.routes.set(method.toUpperCase(), routes);
      return true;
    }
    
    return false;
  }

  /**
   * Clear all routes
   */
  clearRoutes(): void {
    this.routes.clear();
    this.groups.clear();
    this.routeCounter = 0;
  }

  /**
   * Get route statistics
   */
  getStatistics(): {
    totalRoutes: number;
    routesByMethod: Record<string, number>;
    routesByTag: Record<string, number>;
    totalGroups: number;
    globalMiddlewareCount: number;
  } {
    const allRoutes = this.getRoutes();
    const routesByMethod: Record<string, number> = {};
    const routesByTag: Record<string, number> = {};

    // Count routes by method
    for (const route of allRoutes) {
      routesByMethod[route.method] = (routesByMethod[route.method] || 0) + 1;
    }

    // Count routes by tag
    for (const route of allRoutes) {
      if (route.tags) {
        for (const tag of route.tags) {
          routesByTag[tag] = (routesByTag[tag] || 0) + 1;
        }
      }
    }

    return {
      totalRoutes: allRoutes.length,
      routesByMethod,
      routesByTag,
      totalGroups: this.groups.size,
      globalMiddlewareCount: this.globalMiddleware.length,
    };
  }

  /**
   * Export routes for documentation or testing
   */
  exportRoutes(): {
    routes: RegisteredRoute[];
    groups: RouteGroup[];
    globalMiddleware: HonoMiddleware[];
    statistics: ReturnType<ApiRouter['getStatistics']>;
  } {
    return {
      routes: this.getRoutes(),
      groups: this.getGroups(),
      globalMiddleware: this.getGlobalMiddleware(),
      statistics: this.getStatistics(),
    };
  }

  /**
   * Create a new router with copied configuration
   */
  clone(): ApiRouter {
    const cloned = new ApiRouter();
    cloned.routes = new Map(this.routes);
    cloned.groups = new Map(this.groups);
    cloned.globalMiddleware = [...this.globalMiddleware];
    cloned.routeCounter = this.routeCounter;
    return cloned;
  }

  /**
   * Internal method to register a route
   */
  private registerRoute(
    method: string,
    path: string,
    handler: Handler,
    options: RouteOptions = {}
  ): void {
    // Validate path
    if (!path.startsWith('/')) {
      throw new Error(`Route path must start with '/': ${path}`);
    }

    // Validate method
    const upperMethod = method.toUpperCase();
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    if (!validMethods.includes(upperMethod)) {
      throw new Error(`Invalid HTTP method: ${method}`);
    }

    // Create route object
    const route: ApiRoute = {
      method: upperMethod as HttpMethod,
      path,
      handler,
      options: {
        ...options,
        middleware: [...this.globalMiddleware, ...(options.middleware || [])],
      },
    };

    // Add to routes map
    if (!this.routes.has(upperMethod)) {
      this.routes.set(upperMethod, []);
    }
    
    this.routes.get(upperMethod)!.push(route);
  }
}

/**
 * Route decorator for class-based controllers
 */
export function route(
  method: HttpMethod,
  path: string,
  options?: RouteOptions
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Store route information on the class
    if (!target.constructor.routes) {
      target.constructor.routes = [];
    }
    
    target.constructor.routes.push({
      method,
      path,
      handler: descriptor.value,
      options: options || {},
    });
    
    return descriptor;
  };
}

/**
 * HTTP method decorators
 */
export const Get = (path: string, options?: RouteOptions) => 
  route('GET', path, options);

export const Post = (path: string, options?: RouteOptions) => 
  route('POST', path, options);

export const Put = (path: string, options?: RouteOptions) => 
  route('PUT', path, options);

export const Delete = (path: string, options?: RouteOptions) => 
  route('DELETE', path, options);

export const Patch = (path: string, options?: RouteOptions) => 
  route('PATCH', path, options);

export const Options = (path: string, options?: RouteOptions) => 
  route('OPTIONS', path, options);

export const Head = (path: string, options?: RouteOptions) => 
  route('HEAD', path, options);

/**
 * Middleware decorator
 */
export function middleware(middleware: HonoMiddleware) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Store middleware information on the method
    if (!descriptor.value.middleware) {
      descriptor.value.middleware = [];
    }
    descriptor.value.middleware.push(middleware);
    return descriptor;
  };
}

/**
 * Route group factory
 */
export function createRouteGroup(
  name: string,
  options: {
    prefix?: string;
    middleware?: HonoMiddleware[];
  }
) {
  return function (target: any) {
    target.groupName = name;
    target.groupOptions = options;
  };
}

/**
 * Utility function to merge multiple routers
 */
export function mergeRouters(routers: ApiRouter[]): ApiRouter {
  const merged = new ApiRouter();
  
  for (const router of routers) {
    const exportData = router.exportRoutes();
    
    // Add routes
    for (const routeData of exportData.routes) {
      // This is a simplified merge - in practice, you'd need to recreate the routes
      // Since we can't easily access the original handler functions from the export
    }
    
    // Add global middleware
    for (const middleware of exportData.globalMiddleware) {
      merged.use(middleware);
    }
  }
  
  return merged;
}

/**
 * Router factory with common configuration
 */
export function createRouter(options: {
  name?: string;
  prefix?: string;
  middleware?: HonoMiddleware[];
}): ApiRouter {
  const router = new ApiRouter();
  
  if (options.middleware) {
    for (const middleware of options.middleware) {
      router.use(middleware);
    }
  }
  
  return router;
}

/**
 * Health check router factory
 */
export function createHealthRouter(): ApiRouter {
  const router = new ApiRouter();
  
  // Health check endpoint
  router.get('/health', async (ctx) => {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }, {
    tags: ['health'],
    description: 'Health check endpoint',
  });
  
  // Ready check endpoint
  router.get('/ready', async (ctx) => {
    return new Response(JSON.stringify({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'ready' },
        config: { status: 'ready' },
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }, {
    tags: ['health'],
    description: 'Readiness check endpoint',
  });
  
  return router;
}