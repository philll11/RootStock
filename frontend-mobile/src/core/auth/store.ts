import { create } from 'zustand';
import { SecureStorageAdapter } from './storage';

export const AUTH_TOKEN_KEY = 'rootstock_auth_token';
export const REFRESH_TOKEN_KEY = 'rootstock_refresh_token';

interface AuthState {
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    setTokens: (token: string, refreshToken: string) => Promise<void>;
    clearTokens: () => Promise<void>;
    hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    token: null,
    refreshToken: null,
    isAuthenticated: false,

    setTokens: async (token: string, refreshToken: string) => {
        await SecureStorageAdapter.setItem(AUTH_TOKEN_KEY, token);
        await SecureStorageAdapter.setItem(REFRESH_TOKEN_KEY, refreshToken);
        set({ token, refreshToken, isAuthenticated: true });
    },

    clearTokens: async () => {
        await SecureStorageAdapter.removeItem(AUTH_TOKEN_KEY);
        await SecureStorageAdapter.removeItem(REFRESH_TOKEN_KEY);
        set({ token: null, refreshToken: null, isAuthenticated: false });
    },

    hydrate: async () => {
        try {
            const [token, refreshToken] = await Promise.all([
                SecureStorageAdapter.getItem(AUTH_TOKEN_KEY),
                SecureStorageAdapter.getItem(REFRESH_TOKEN_KEY),
            ]);

            if (token && refreshToken) {
                set({ token, refreshToken, isAuthenticated: true });
            } else {
                set({ token: null, refreshToken: null, isAuthenticated: false });
            }
        } catch (error) {
            console.error('Auth hydration failed', error);
            set({ token: null, refreshToken: null, isAuthenticated: false });
        }
    },
}));

// Vanilla Accessors for Interceptors / Logic outside React
export const getToken = () => useAuthStore.getState().token;
export const getRefreshToken = () => useAuthStore.getState().refreshToken;
export const setTokens = (token: string, refreshToken: string) => useAuthStore.getState().setTokens(token, refreshToken);
export const clearTokens = () => useAuthStore.getState().clearTokens();
