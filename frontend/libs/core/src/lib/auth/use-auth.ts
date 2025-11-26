import { useState, useEffect } from 'react';
import { getToken, subscribeToAuth, clearToken } from './auth.store';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getToken();
      setIsAuthenticated(!!token);
    };
    checkAuth();

    const unsubscribe = subscribeToAuth((token) => {
      setIsAuthenticated(!!token);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    await clearToken();
  };

  return { isAuthenticated, isLoading: isAuthenticated === null, logout };
};
