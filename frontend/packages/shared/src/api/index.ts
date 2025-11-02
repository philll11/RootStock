// frontend/packages/shared/src/api/index.ts

import axios from 'axios';

// --- ACTION REQUIRED ---
// You must replace this placeholder with a real, valid JWT from your backend.
// This is for MVP purposes only. In a real app, this will be handled by a login flow.
const MVP_TEST_TOKEN = 'PASTE_YOUR_VALID_TEST_JWT_HERE';

const apiClient = axios.create({
    // This assumes your NestJS backend is running on the default port 3000.
    // Adjust if your backend is on a different port.
    baseURL: 'http://localhost:3000',
});

// We use an Axios Interceptor to automatically attach the Authorization header
// to every single request made with this apiClient instance.
apiClient.interceptors.request.use(
    (config) => {
        if (MVP_TEST_TOKEN) {
            config.headers.Authorization = `Bearer ${MVP_TEST_TOKEN}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

export default apiClient;