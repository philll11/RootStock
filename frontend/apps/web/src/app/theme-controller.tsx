import { useEffect } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { useGetProfile } from '@rootstock/iam/auth/auth-data-access';

export function ThemeController() {
  const { data: user } = useGetProfile();
  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    if (user?.preferences?.theme) {
      setColorScheme(user.preferences.theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.preferences?.theme]);

  return null;
}
