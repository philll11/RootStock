import { apiClient } from '../api/client';
import { AuthResponse, LoginCredentials } from './auth.schema';

export const AuthService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },
  
  logout: async (): Promise<void> => {
    // TODO: Clear token from storage
  }
};
