/**
 * Security Headers Middleware
 * Adds comprehensive security headers to all responses
 */

import type { Context } from 'hono';
import { getServerConfig } from '../../config';

/**
 * Security headers configuration
 */
interface SecurityHeadersConfig {
  strictTransportSecurity?: boolean;
  contentTypeOptions?: boolean;
  frameOptions?: 'DENY' | 'SAMEORIGIN';
  xssProtection?: boolean;
  referrerPolicy?: 'no-referrer' | 'strict-origin-when-cross-origin' | 'same-origin';
  permissionsPolicy?: string;
  contentSecurityPolicy?: string;
}

/**
 * Default security headers configuration
 */
const DEFAULT_SECURITY_CONFIG: SecurityHeadersConfig = {
  strictTransportSecurity: true,
  contentTypeOptions: true,
  frameOptions: 'DENY',
  xssProtection: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'geolocation=(), microphone=(), camera=(), payment=()',
  contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; frame-src 'self'; object-src 'none'; media-src 'self'; worker-src 'self'; child-src 'self';",
};

/**
 * Get security configuration from server config
 */
function getSecurityConfig(): SecurityHeadersConfig {
  try {
    const serverConfig = getServerConfig();
    return {
      ...DEFAULT_SECURITY_CONFIG,
      ...serverConfig.security,
    };
  } catch {
    // Fallback to defaults if config is not available
    return DEFAULT_SECURITY_CONFIG;
  }
}

/**
 * Security middleware
 * Adds comprehensive security headers to all responses
 */
export async function securityMiddleware(ctx: Context, next: () => Promise<void>): Promise<void> {
  const config = getSecurityConfig();
  
  // Strict Transport Security
  if (config.strictTransportSecurity) {
    ctx.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Content Type Options
  if (config.contentTypeOptions) {
    ctx.header('X-Content-Type-Options', 'nosniff');
  }
  
  // Frame Options
  if (config.frameOptions) {
    ctx.header('X-Frame-Options', config.frameOptions);
  }
  
  // XSS Protection
  if (config.xssProtection) {
    ctx.header('X-XSS-Protection', '1; mode=block');
  }
  
  // Referrer Policy
  if (config.referrerPolicy) {
    ctx.header('Referrer-Policy', config.referrerPolicy);
  }
  
  // Permissions Policy
  if (config.permissionsPolicy) {
    ctx.header('Permissions-Policy', config.permissionsPolicy);
  }
  
  // Content Security Policy
  if (config.contentSecurityPolicy) {
    ctx.header('Content-Security-Policy', config.contentSecurityPolicy);
  }
  
  // Remove server information
  ctx.header('Server', ''); // Remove or obfuscate server information
  
  await next();
}

/**
 * Content Security Policy middleware with custom policies
 */
export function createContentSecurityPolicyMiddleware(
  policy: string
): (ctx: Context, next: () => Promise<void>) => Promise<void> {
  return async (ctx: Context, next: () => Promise<void>) => {
    ctx.header('Content-Security-Policy', policy);
    await next();
  };
}

/**
 * Strict Transport Security middleware
 */
export function createStrictTransportSecurityMiddleware(
  maxAge: number = 31536000,
  includeSubDomains: boolean = true,
  preload: boolean = false
): (ctx: Context, next: () => Promise<void>) => Promise<void> {
  return async (ctx: Context, next: () => Promise<void>) => {
    let directive = `max-age=${maxAge}`;
    
    if (includeSubDomains) {
      directive += '; includeSubDomains';
    }
    
    if (preload) {
      directive += '; preload';
    }
    
    ctx.header('Strict-Transport-Security', directive);
    await next();
  };
}

/**
 * Custom security headers middleware
 */
export function createCustomSecurityHeadersMiddleware(
  headers: Record<string, string>
): (ctx: Context, next: () => Promise<void>) => Promise<void> {
  return async (ctx: Context, next: () => Promise<void>) => {
    for (const [key, value] of Object.entries(headers)) {
      ctx.header(key, value);
    }
    await next();
  };
}