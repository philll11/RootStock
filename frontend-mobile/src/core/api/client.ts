import axios from 'axios';
import { Platform } from 'react-native';

// TODO: Move this to a shared config or env variable
const LOCALHOST = Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';
export const API_URL = process.env.EXPO_PUBLIC_API_URL || LOCALHOST;

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'x-client-platform': 'mobile',
    },
});

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
