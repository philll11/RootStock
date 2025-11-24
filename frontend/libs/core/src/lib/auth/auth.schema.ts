import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginCredentials = z.infer<typeof LoginSchema>;

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
}
