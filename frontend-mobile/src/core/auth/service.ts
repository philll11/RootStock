import { apiClient } from '../api/client';
import { clearTokens } from './store';
import { LoginCredentials, AuthResponse } from 'types/iam/auth.schema';

export const AuthService = {
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>(
            '/auth/local/login',
            {
                email: credentials.username,
                password: credentials.password,
            }
        );
        return response.data;
    },

    logout: async (): Promise<void> => {
        try {
            await apiClient.post('/auth/logout');
        } catch (e) {
            // Ignore network errors on logout, just clear local state
            console.warn('Logout API call failed, clearing local state anyway');
        }
        await clearTokens();
    },

    forgotPassword: async (email: string): Promise<void> => {
        await apiClient.post('/auth/forgot-password', { email });
    },

    resetPassword: async (token: string, newPassword: string): Promise<void> => {
        await apiClient.post('/auth/reset-password', { token, newPassword });
    },
};
