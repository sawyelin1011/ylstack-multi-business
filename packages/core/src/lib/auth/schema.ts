/**
 * Authentication Validation Schemas (Zod)
 */

import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.enum(['admin', 'editor', 'viewer', 'user']).optional(),
}).refine((data) => data.name || data.password || data.role, {
  message: 'At least one field must be provided',
});

export const UserFilterSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer', 'user']).optional(),
  search: z.string().optional(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserFilterInput = z.infer<typeof UserFilterSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
