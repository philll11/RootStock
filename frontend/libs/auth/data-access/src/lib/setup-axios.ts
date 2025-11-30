import { apiClient } from '@rootstock/shared/api-client';
import { getToken } from './auth.store';

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
};
