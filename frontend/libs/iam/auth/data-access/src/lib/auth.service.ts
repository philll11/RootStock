import { apiClient } from '@rootstock/shared/api-client';
import { AuthResponse, LoginCredentials } from '../../types/iam/auth.schema';
import { getPlatform } from './auth.store';

export const AuthService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const platform = getPlatform();
    const response = await apiClient.post<AuthResponse>(
      '/auth/local/login',
      {
        email: credentials.username,
        password: credentials.password,
      },
      {
        headers: {
          'x-client-platform': platform,
        },
      }
    );
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { token, newPassword });
  },
};
