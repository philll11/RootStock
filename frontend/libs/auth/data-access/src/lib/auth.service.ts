import { apiClient } from '@rootstock/shared/api-client';
import { AuthResponse, LoginCredentials } from './auth.schema';
import { getPlatform } from './auth.store';

export const AuthService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const platform = getPlatform();
    const response = await apiClient.post<AuthResponse>('/auth/local/login', {
      email: credentials.username,
      password: credentials.password,
    }, {
      headers: {
        'x-client-platform': platform,
      }
    });
    return response.data;
  },
  
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  }
};
