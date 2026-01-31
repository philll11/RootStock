import axios from 'axios';
import { notify, appControl } from '@/utils';

// Determine the base URL based on the environment
// We rely on NX_PUBLIC_API_URL being set in the environment (e.g. .env files)
const envUrl = process.env['NX_PUBLIC_API_URL'];

// Create a shared Axios instance
export const apiClient = axios.create({
  baseURL: envUrl || 'http://localhost:3330',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for cross-origin requests
});

// Global Error Handler for OCC (409 Conflict)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config as any;

    if (error.response?.status === 409 && !config?.skipGlobalErrorHandler) {
      notify.errorWithAction(
        error,
        'Refresh Page',
        () => appControl.reload(),
        'Update Failed'
      );
    }
    return Promise.reject(error);
  }
);

/**
 * Checks if the API is reachable by pinging the status endpoint.
 * This is a Tier 3 connectivity check.
 */
export const checkApiReachability = async (): Promise<boolean> => {
  try {
    // low timeout to prevent blocking "online" status for too long
    await apiClient.head('/status/ready', { timeout: 3000 });
    return true;
  } catch (error) {
    return false;
  }
};
