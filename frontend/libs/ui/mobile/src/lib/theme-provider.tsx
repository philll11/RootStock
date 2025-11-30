import React, { useMemo } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { useAuth } from '@rootstock/auth/data-access';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const { user } = useAuth();

  const isDark = useMemo(() => {
    const userPref = user?.preferences?.theme || 'auto';
    return userPref === 'auto' 
      ? colorScheme === 'dark' 
      : userPref === 'dark';
  }, [user?.preferences?.theme, colorScheme]);

  const theme = isDark ? MD3DarkTheme : MD3LightTheme;

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
