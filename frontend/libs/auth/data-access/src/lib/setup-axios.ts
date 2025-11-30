import { apiClient } from '@rootstock/shared/api-client';
import { getToken, clearToken } from './auth.store';

export const setupAuthInterceptor = () => {
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
      if (error.response && error.response.status === 401) {
        await clearToken();
      }
      return Promise.reject(error);
    }
  );
};
