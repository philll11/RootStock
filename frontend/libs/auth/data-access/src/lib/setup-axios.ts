import { apiClient } from '@rootstock/shared/api-client';
import { getToken, clearToken } from './auth.store';

let suppressSessionExpiry = false;

export const setSuppressSessionExpiry = (value: boolean) => {
  suppressSessionExpiry = value;
};

export const setupAuthInterceptor = (onSessionExpired?: () => void) => {
  apiClient.interceptors.request.use(
    async (config) => {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const isLoginRequest = error.config?.url?.includes('/auth/local/login');
      
      if (error.response && error.response.status === 401 && !isLoginRequest && !suppressSessionExpiry) {
        await clearToken();
        if (onSessionExpired) {
          onSessionExpired();
        }
      }
      return Promise.reject(error);
    }
  );
};
