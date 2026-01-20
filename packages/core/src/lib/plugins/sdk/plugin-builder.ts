/**
 * Plugin Builder SDK
 * Fluent API for creating plugins
 */

import type {
  Plugin,
  Route,
  Middleware,
  ModelDefinition,
  ServiceDefinition,
  AdminPageDefinition,
  HookDefinition,
  PluginLifecycle,
} from '../types';

interface PluginBuilderState {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  dependencies: string[];
  routes: Route[];
  middleware: Middleware[];
  models: ModelDefinition[];
  services: ServiceDefinition[];
  adminPages: AdminPageDefinition[];
  hooks: HookDefinition[];
  lifecycle?: PluginLifecycle;
}

class PluginBuilder {
  private state: PluginBuilderState;

  constructor(name: string, version: string) {
    this.state = {
      name,
      version,
      dependencies: [],
      routes: [],
      middleware: [],
      models: [],
      services: [],
      adminPages: [],
      hooks: [],
    };
  }

  /**
   * Set plugin metadata
   */
  metadata(metadata: {
    description?: string;
    author?: string;
    license?: string;
    homepage?: string;
  }): PluginBuilder {
    Object.assign(this.state, metadata);
    return this;
  }

  /**
   * Add dependency
   */
  dependency(name: string): PluginBuilder {
    this.state.dependencies.push(name);
    return this;
  }

  /**
   * Add multiple dependencies
   */
  dependencies(...names: string[]): PluginBuilder {
    this.state.dependencies.push(...names);
    return this;
  }

  /**
   * Add a route
   */
  addRoute(route: Route): PluginBuilder {
    this.state.routes.push(route);
    return this;
  }

  /**
   * Add multiple routes
   */
  addRoutes(...routes: Route[]): PluginBuilder {
    this.state.routes.push(...routes);
    return this;
  }

  /**
   * Add middleware
   */
  addMiddleware(middleware: Middleware): PluginBuilder {
    this.state.middleware.push(middleware);
    return this;
  }

  /**
   * Add multiple middleware
   */
  addMiddlewareList(...middleware: Middleware[]): PluginBuilder {
    this.state.middleware.push(...middleware);
    return this;
  }

  /**
   * Add a database model
   */
  addModel(name: string, schema: any): PluginBuilder {
    this.state.models.push({ name, schema });
    return this;
  }

  /**
   * Add multiple models
   */
  addModelList(...models: ModelDefinition[]): PluginBuilder {
    this.state.models.push(...models);
    return this;
  }

  /**
   * Add a service
   */
  addService(name: string, factory: () => any): PluginBuilder {
    this.state.services.push({ name, factory });
    return this;
  }

  /**
   * Add multiple services
   */
  addServiceList(...services: ServiceDefinition[]): PluginBuilder {
    this.state.services.push(...services);
    return this;
  }

  /**
   * Add an admin page
   */
  addAdminPage(page: AdminPageDefinition): PluginBuilder {
    this.state.adminPages.push(page);
    return this;
  }

  /**
   * Add multiple admin pages
   */
  addAdminPageList(...pages: AdminPageDefinition[]): PluginBuilder {
    this.state.adminPages.push(...pages);
    return this;
  }

  /**
   * Add a hook
   */
  addHook(name: string, handler: HookDefinition['handler'], priority?: number): PluginBuilder {
    this.state.hooks.push({ name, handler, priority: priority || 0 });
    return this;
  }

  /**
   * Add multiple hooks
   */
  addHookList(...hooks: HookDefinition[]): PluginBuilder {
    this.state.hooks.push(...hooks);
    return this;
  }

  /**
   * Set lifecycle handlers
   */
  lifecycle(lifecycle: PluginLifecycle): PluginBuilder {
    this.state.lifecycle = lifecycle;
    return this;
  }

  /**
   * Build the plugin
   */
  build(): Plugin {
    return {
      name: this.state.name,
      version: this.state.version,
      description: this.state.description,
      author: this.state.author,
      license: this.state.license,
      homepage: this.state.homepage,
      dependencies: this.state.dependencies.length > 0 ? this.state.dependencies : undefined,
      routes: this.state.routes.length > 0 ? this.state.routes : undefined,
      middleware: this.state.middleware.length > 0 ? this.state.middleware : undefined,
      models: this.state.models.length > 0 ? this.state.models : undefined,
      services: this.state.services.length > 0 ? this.state.services : undefined,
      adminPages: this.state.adminPages.length > 0 ? this.state.adminPages : undefined,
      hooks: this.state.hooks.length > 0 ? this.state.hooks : undefined,
      lifecycle: this.state.lifecycle || {},
    };
  }
}

/**
 * Create a new plugin builder
 */
export function createPlugin(name: string, version: string): PluginBuilder {
  return new PluginBuilder(name, version);
}

export { PluginBuilder };
