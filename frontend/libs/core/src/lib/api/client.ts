import axios from 'axios';

// Create a shared Axios instance
export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000', // Fallback for local dev
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the token if it exists
apiClient.interceptors.request.use(
  (config) => {
    // TODO: Retrieve token from secure storage (platform specific)
    // For now, we'll just leave this placeholder
    const token = null; 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
