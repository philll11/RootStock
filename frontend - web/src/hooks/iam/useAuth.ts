// src/hooks/iam/useAuth.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { login, logout, getProfile } from 'api/iam/auth';
import { LoginCredentials } from 'types/iam/auth.schema';

export const AUTH_KEYS = {
    all: ['auth'] as const,
    profile: () => [...AUTH_KEYS.all, 'profile'] as const,
};

export function useAuthSession() {
    const { data: user, isLoading, error } = useQuery({
        queryKey: AUTH_KEYS.profile(),
        queryFn: getProfile,
        retry: false, // Don't retry if 401
        refetchOnWindowFocus: true, // Re-check session when user comes back
        staleTime: 1000 * 60 * 5, // Consider profile fresh for 5 mins unless invalidated
    });

    const isAuthenticated = !!user;

    console.log('[useAuthSession]', { isAuthenticated, isLoading, error, user });

    return {
        user,
        isLoading,
        isAuthenticated,
        error
    };
}

export function useLogin() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (credentials: LoginCredentials) => login(credentials),
        onSuccess: () => {
            // Force refetch of profile to establish session state
            queryClient.invalidateQueries({ queryKey: AUTH_KEYS.profile() });
        },
    });
}

export function useLogout() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: logout,
        onSuccess: () => {
             console.log('[useLogout] Logout successful, clearing query data...');
             // Clear profile data immediately to trigger UI update
            queryClient.setQueryData(AUTH_KEYS.profile(), null);
        },
    });
}
