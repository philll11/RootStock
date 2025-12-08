import axios from 'axios';

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
