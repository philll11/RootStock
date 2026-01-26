// src/hooks/iam/useAuth.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { login, logout, getProfile } from 'api/iam/auth';

export const AUTH_KEYS = {
  all: ['auth'] as const,
  profile: () => [...AUTH_KEYS.all, 'profile'] as const
};

export function useAuthSession() {
  const {
    data: user,
    isLoading,
    error
  } = useQuery({
    queryKey: AUTH_KEYS.profile(),
    queryFn: getProfile,
    retry: false, // Don't retry if 401
    refetchOnWindowFocus: true, // Re-check session when user comes back
    staleTime: 1000 * 60 * 5 // Consider profile fresh for 5 mins unless invalidated
  });

  const isAuthenticated = !!user;

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
    mutationFn: login,
    onSuccess: () => {
      // Force refetch of profile to establish session state
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.profile() });
    }
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Clear profile data immediately to trigger UI update
      queryClient.setQueryData(AUTH_KEYS.profile(), null);
    }
  });
}
