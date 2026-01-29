import axios from 'axios';
import { apiClient, API_URL } from '../api/client';
import { getRefreshToken, setTokens, clearTokens, getToken } from './store';

// Queue for failed requests during refresh
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

export const setupAuthInterceptor = (onSessionExpired?: () => void) => {
    apiClient.interceptors.request.use(
        (config) => {
            const token = getToken();
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

            // Safety check for URLs to avoid infinite loops
            const isLoginRequest = originalRequest?.url?.includes('/auth/local/login');
            const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');

            if (
                error.response &&
                error.response.status === 401 &&
                !isLoginRequest &&
                !isRefreshRequest &&
                !originalRequest._retry
            ) {
                // If already refreshing, queue this request
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

                const refreshToken = getRefreshToken();

                if (!refreshToken) {
                    // No refresh token, force logout
                    isRefreshing = false;
                    await clearTokens();
                    if (onSessionExpired) onSessionExpired();
                    return Promise.reject(error);
                }

                try {
                    // Use a separate axios instance to avoid infinite loops if interceptors are attached
                    // although we are calling the base axios, not apiClient here.
                    const response = await axios.post(
                        `${API_URL}/auth/refresh`,
                        { refreshToken },
                        {
                            headers: {
                                'x-client-platform': 'mobile',
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    const { accessToken, refreshToken: newRefreshToken } = response.data;

                    // Update store
                    await setTokens(accessToken, newRefreshToken);

                    // Update header for future requests
                    apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;

                    // Update header for this retry
                    originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;

                    // Process queue
                    processQueue(null, accessToken);
                    isRefreshing = false;

                    return apiClient(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    isRefreshing = false;

                    // Refresh failed (expired or revoked) -> Hard Logout
                    await clearTokens();
                    if (onSessionExpired) onSessionExpired();
                    return Promise.reject(refreshError);
                }
            }

            return Promise.reject(error);
        }
    );
};
