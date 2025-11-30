import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getToken, subscribeToAuth, clearToken, getPlatform } from './auth.store';
import { apiClient } from '@rootstock/shared/api-client';
import { AuthService } from './auth.service';
import { User } from '@rootstock/users/data-access';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading } = useQuery<User>({
    queryKey: ['auth', 'profile'],
    queryFn: async () => {
      const response = await apiClient.get<User>('/auth/profile');
      return response.data;
    },
    enabled: isAuthenticated === true,
    retry: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const platform = getPlatform();
      if (platform === 'mobile') {
        const token = await getToken();
        setIsAuthenticated(!!token);
      } else {
        // Web: Check session via API
        try {
          await apiClient.get('/auth/profile');
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
          queryClient.setQueryData(['auth', 'profile'], null);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (e) {
      console.error('Logout failed', e);
    } finally {
      await clearToken();
      setIsAuthenticated(false);
      queryClient.setQueryData(['auth', 'profile'], null);
    }
  };

  return { 
    isAuthenticated, 
    isLoading: isAuthenticated === null || (isAuthenticated && isUserLoading), 
    user,
    logout 
  };
};
