import { useState, useEffect } from 'react';
import { getToken, subscribeToAuth, clearToken, getPlatform } from './auth.store';
import { apiClient } from '../api/client';
import { AuthService } from './auth.service';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

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
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (e) {
      console.error('Logout failed', e);
    } finally {
      await clearToken();
    }
  };

  return { isAuthenticated, isLoading: isAuthenticated === null, logout };
};
