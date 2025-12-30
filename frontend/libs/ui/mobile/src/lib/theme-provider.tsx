// frontend/libs/ui/mobile/src/lib/theme-provider.tsx
import React, { useMemo } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { useAuth } from '@rootstock/iam/auth/auth-data-access';
import { mobileLightTheme, mobileDarkTheme } from './mobile-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const { user } = useAuth();

  const isDark = useMemo(() => {
    const userPref = user?.preferences?.theme || 'auto';
    return userPref === 'auto' 
      ? colorScheme === 'dark' 
      : userPref === 'dark';
  }, [user?.preferences?.theme, colorScheme]);

  const theme = isDark ? mobileDarkTheme : mobileLightTheme;

  return (
    <PaperProvider theme={theme}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background}
      />
      {children}
    </PaperProvider>
  );
}
