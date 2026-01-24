import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getToken,
  subscribeToAuth,
  clearToken,
  getPlatform,
  setToken,
} from './auth.store';
import { apiClient } from '@rootstock/shared/api-client';
import { AuthService } from './auth.service';
import { User } from '@rootstock/iam/users/users-data-access';
import { LoginCredentials, AuthResponse } from '../../types/iam/auth.schema';

export const AUTH_KEYS = {
  all: ['auth'] as const,
  profile: () => [...AUTH_KEYS.all, 'profile'] as const,
};

export function useAuthSession() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const platform = getPlatform();
      if (platform === 'mobile') {
        const token = await getToken();
        setIsAuthenticated(!!token);
      } else {
        // Web: Check session via API
        try {
          const response = await apiClient.get<User>('/auth/profile');
          queryClient.setQueryData(AUTH_KEYS.profile(), response.data);
          setIsAuthenticated(true);
        } catch (error) {
          setIsAuthenticated(false);
        }
      }
    };
    checkAuth();

    const unsubscribe = subscribeToAuth((token) => {
      const platform = getPlatform();
      if (platform === 'mobile') {
        setIsAuthenticated(!!token);
      } else {
        // On Web, if token is cleared (logout), we know we are logged out.
        // Login doesn't set token, so this won't fire on login.
        if (token === null) {
          setIsAuthenticated(false);
          queryClient.setQueryData(AUTH_KEYS.profile(), null);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return {
    isAuthenticated,
    isLoading: isAuthenticated === null,
  };
}

export function useGetProfile() {
  const { isAuthenticated } = useAuthSession();

  return useQuery({
    queryKey: AUTH_KEYS.profile(),
    queryFn: async () => {
      const response = await apiClient.get<User>('/auth/profile');
      return response.data;
    },
    enabled: isAuthenticated === true,
    retry: false,
  });
}

export function useLogin() {
  return useMutation<AuthResponse, Error, LoginCredentials>({
    mutationFn: (credentials) => AuthService.login(credentials),
    onSuccess: async (data) => {
      await setToken(data.accessToken, data.refreshToken);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await AuthService.logout();
    },
    onSuccess: async () => {
      await clearToken();
      queryClient.setQueryData(AUTH_KEYS.profile(), null);
    },
  });
}
