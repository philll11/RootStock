// src/types/iam/auth.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
}

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address'),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema> & { token: string };
