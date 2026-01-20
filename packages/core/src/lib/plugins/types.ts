/**
 * Plugin System Types
 */

import type { Context as HonoContext } from 'hono';

export interface Plugin {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  dependencies?: string[];
  routes?: Route[];
  middleware?: Middleware[];
  models?: ModelDefinition[];
  services?: ServiceDefinition[];
  adminPages?: AdminPageDefinition[];
  hooks?: HookDefinition[];
  config?: PluginConfigSchema;
  lifecycle: PluginLifecycle;
}

export interface Route {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
  handler: RouteHandler;
  middleware?: string[];
  auth?: boolean;
  permissions?: string[];
}

export type RouteHandler = (c: HonoContext) => Promise<Response> | Response;

export interface Middleware {
  name: string;
  handler: MiddlewareHandler;
  priority?: number;
}

export type MiddlewareHandler = (c: HonoContext, next: () => Promise<void>) => Promise<void>;

export interface ModelDefinition {
  name: string;
  schema: any;
}

export interface ServiceDefinition {
  name: string;
  factory: () => any;
}

export interface AdminPageDefinition {
  path: string;
  title: string;
  icon?: string;
  component?: string;
  permissions?: string[];
  order?: number;
}

export interface HookDefinition {
  name: string;
  handler: HookHandler;
  priority?: number;
}

export type HookHandler<T = any, R = any> = (
  data: T,
  context: HookContext
) => R | Promise<R>;

export interface PluginLifecycle {
  install?: (ctx: PluginContext) => Promise<void>;
  uninstall?: (ctx: PluginContext) => Promise<void>;
  activate?: (ctx: PluginContext) => Promise<void>;
  deactivate?: (ctx: PluginContext) => Promise<void>;
}

export interface PluginContext {
  db: any;
  config: any;
  logger: any;
  pluginName: string;
  pluginVersion: string;
}

export interface HookContext {
  pluginName: string;
  timestamp: number;
  [key: string]: any;
}

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  dependencies?: string[];
  enabled: boolean;
  installedAt: number;
  updatedAt: number;
  config?: Record<string, any>;
}

export interface PluginConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    default?: any;
    required?: boolean;
    description?: string;
    options?: any[];
  };
}

export interface PluginConfig {
  [key: string]: any;
}

export interface PluginLoadResult {
  plugin: Plugin;
  path: string;
}

export type PluginState = 'installed' | 'active' | 'inactive' | 'error';

export interface HookName {
  app: {
    init: 'app:init';
    ready: 'app:ready';
    shutdown: 'app:shutdown';
  };
  request: {
    start: 'request:start';
    end: 'request:end';
    error: 'request:error';
  };
  auth: {
    register: 'auth:register';
    login: 'auth:login';
    logout: 'auth:logout';
    passwordChange: 'auth:password_change';
  };
  content: {
    create: 'content:create';
    update: 'content:update';
    delete: 'content:delete';
    publish: 'content:publish';
  };
  plugin: {
    install: 'plugin:install';
    activate: 'plugin:activate';
    deactivate: 'plugin:deactivate';
    uninstall: 'plugin:uninstall';
  };
}

export type StandardHookName =
  | HookName['app'][keyof HookName['app']]
  | HookName['request'][keyof HookName['request']]
  | HookName['auth'][keyof HookName['auth']]
  | HookName['content'][keyof HookName['content']]
  | HookName['plugin'][keyof HookName['plugin']];
