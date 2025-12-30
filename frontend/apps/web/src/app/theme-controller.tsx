import { useEffect } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { useAuth } from '@rootstock/iam/auth/auth-data-access';

export function ThemeController() {
  const { user } = useAuth();
  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    if (user?.preferences?.theme) {
      setColorScheme(user.preferences.theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.preferences?.theme]);

  return null;
}
