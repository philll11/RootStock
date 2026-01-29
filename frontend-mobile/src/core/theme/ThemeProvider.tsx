import React from 'react';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider, adaptNavigationTheme } from 'react-native-paper';
import { ThemeProvider as NavigationThemeProvider, DarkTheme as NavDarkTheme, DefaultTheme as NavDefaultTheme } from '@react-navigation/native';

// TODO: Port custom theme tokens from legacy app (frontend/libs/ui/theme)
const { LightTheme, DarkTheme } = adaptNavigationTheme({
    reactNavigationLight: NavDefaultTheme,
    reactNavigationDark: NavDarkTheme,
}) as { LightTheme: any, DarkTheme: any };

const CombinedDefaultTheme = {
    ...MD3LightTheme,
    ...LightTheme,
    fonts: MD3LightTheme.fonts,
    colors: {
        ...MD3LightTheme.colors,
        ...LightTheme.colors,
        // Add custom brand colors here later
    },
};

const CombinedDarkTheme = {
    ...MD3DarkTheme,
    ...DarkTheme,
    fonts: MD3DarkTheme.fonts,
    colors: {
        ...MD3DarkTheme.colors,
        ...DarkTheme.colors,
        // Add custom brand colors here later
    },
};

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const theme = isDark ? CombinedDarkTheme : CombinedDefaultTheme;

    return (
        <PaperProvider theme={theme}>
            <NavigationThemeProvider value={theme}>
                {children}
            </NavigationThemeProvider>
        </PaperProvider>
    );
};
