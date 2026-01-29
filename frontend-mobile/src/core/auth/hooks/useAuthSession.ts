import { useAuthStore, setTokens, clearTokens } from '../store';
import { AuthService } from '../service';
import { checkApiReachability } from '@/src/core/api/client';
import { LoginCredentials } from 'types/iam/auth.schema';
import { useState } from 'react';

export const useAuthSession = () => {
    const { isAuthenticated, token, refreshToken } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    const login = async (credentials: LoginCredentials) => {
        setIsLoading(true);
        setError(null);

        // Feature 1: Intelligent Connectivity - Verify True Online Status
        const isOnline = await checkApiReachability();
        if (!isOnline) {
            setIsLoading(false);
            // TODO: Use a proper error code or object that UI can interpret
            setError(new Error('Unable to connect to server. Please check your internet connection.'));
            return;
        }

        try {
            const response = await AuthService.login(credentials);

            if (response.accessToken) {
                // Fallback if refreshToken is not sent (should be sent for mobile)
                const rToken = response.refreshToken || '';
                await setTokens(response.accessToken, rToken);
            }
        } catch (e) {
            setError(e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await AuthService.logout();
        } catch (e) {
            console.error(e);
        } finally {
            await clearTokens(); // Ensure local state is cleared
            setIsLoading(false);
        }
    };

    return {
        isAuthenticated,
        token, // debug mostly
        login,
        logout,
        forgotPassword: AuthService.forgotPassword,
        resetPassword: AuthService.resetPassword,
        isLoading,
        error,
    };
};
