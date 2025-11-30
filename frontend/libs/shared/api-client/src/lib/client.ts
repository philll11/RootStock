import axios from 'axios';

// Create a shared Axios instance
export const apiClient = axios.create({
  baseURL: process.env['EXPO_PUBLIC_API_URL'] || 'http://localhost:3330', // Fallback for local dev
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for cross-origin requests
});
