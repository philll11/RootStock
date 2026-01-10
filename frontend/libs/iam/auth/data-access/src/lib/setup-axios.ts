import { apiClient } from '@rootstock/shared/api-client';
import { getToken, clearToken, getRefreshToken, setToken, getPlatform } from './auth.store';
import axios from 'axios';

let suppressSessionExpiry = false;
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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
      const originalRequest = error.config;
      const isLoginRequest = originalRequest?.url?.includes('/auth/local/login');
      const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');

      if (
        error.response &&
        error.response.status === 401 &&
        !isLoginRequest &&
        !isRefreshRequest &&
        !suppressSessionExpiry
      ) {
        if (getPlatform() === 'mobile') {
          if (isRefreshing) {
            return new Promise(function (resolve, reject) {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers['Authorization'] = 'Bearer ' + token;
                return apiClient(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          const refreshToken = await getRefreshToken();

          if (!refreshToken) {
            // No refresh token, logout
            isRefreshing = false;
            await clearToken();
            if (onSessionExpired) onSessionExpired();
            return Promise.reject(error);
          }

          try {
            // Use a separate axios instance to avoid infinite loops if interceptors are attached
            const response = await axios.post(
              `${apiClient.defaults.baseURL}/auth/refresh`,
              { refreshToken },
              { headers: { 'x-client-platform': 'mobile' } }
            );

            const { accessToken, refreshToken: newRefreshToken } = response.data;
            await setToken(accessToken, newRefreshToken);

            apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
            originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;

            processQueue(null, accessToken);
            isRefreshing = false;

            return apiClient(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError, null);
            isRefreshing = false;
            // Refresh failed (expired or revoked) -> Soft Logout
            // DO NOT CLEAR TOKEN HERE if we want to support "Re-Auth Modal"
            // But for now, we trigger the session expired callback
            if (onSessionExpired) {
              onSessionExpired();
            }
            return Promise.reject(refreshError);
          }
        } else {
          // Web: HttpOnly cookie handles refresh automatically via browser?
          // Actually, if we get a 401 on Web, it means the Access Token cookie expired.
          // We should try to hit /refresh endpoint (which sends the Refresh Cookie).
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            try {
              await apiClient.post('/auth/refresh');
              // If successful, cookies are updated. Retry original request.
              return apiClient(originalRequest);
            } catch (refreshError) {
              // Refresh failed -> Logout
              await clearToken();
              if (onSessionExpired) onSessionExpired();
              return Promise.reject(refreshError);
            }
          }
        }
      }
      return Promise.reject(error);
    }
  );
};
