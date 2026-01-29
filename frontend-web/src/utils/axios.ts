/**
 * axios setup
 */
import axios from 'axios';

const axiosServices = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3330',
  withCredentials: true,
  headers: {
    'x-client-platform': 'web'
  }
});

axiosServices.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject((error.response && error.response.data) || 'Wrong Services');
    }

    // Check if it's a 401 and NOT a login or refresh request
    const isLoginRequest = originalRequest.url?.includes('/auth/local/login');
    const isRefreshRequest = originalRequest.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !isLoginRequest && !isRefreshRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token
        // The backend should read the Refresh Token from Cookie and set a new Access Token Cookie
        await axiosServices.post('/auth/refresh');

        // Retry the original request
        return axiosServices(originalRequest);
      } catch (refreshError) {
        // Refresh failed (token expired/invalid)
        // We let the error propagate.
        // The React Query Hooks (useAuthSession) will catch this 401/error and the user state will be cleared/updated.
        return Promise.reject((refreshError as any).response?.data || 'Session expired');
      }
    }

    return Promise.reject((error.response && error.response.data) || 'Wrong Services');
  }
);

export default axiosServices;
