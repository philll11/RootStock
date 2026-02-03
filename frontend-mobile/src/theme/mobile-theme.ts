// frontend/libs/ui/mobile/src/lib/mobile-theme.ts
import { MD3LightTheme, MD3DarkTheme, MD3Theme } from 'react-native-paper';
import { palette, lightColors, darkColors } from '@/theme/palette';
import { typography, spacing, radius } from '@/theme/typography';

// Map our tokens to React Native Paper's MD3 Theme
// https://callstack.github.io/react-native-paper/docs/guides/theming

export type AppTheme = MD3Theme & {
  customColors: {
    status: {
      active: string;
      activeContainer: string;
      onActiveContainer: string;
      inactive: string;
      inactiveContainer: string;
      onInactiveContainer: string;
    };
  };
};

const baseTheme = {
  roundness: radius.md,
  fonts: {
    // We are using system fonts, so we map to the default MD3 configurations
    // In a real app with custom fonts, we would configure the font families here
    ...MD3LightTheme.fonts,
  },
};

export const mobileLightTheme: AppTheme = {
  ...MD3LightTheme,
  ...baseTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.brand.primary,
    onPrimary: palette.neutral[0],
    primaryContainer: lightColors.brand.secondary,
    onPrimaryContainer: palette.brand[900],

    background: lightColors.background.page,
    surface: lightColors.background.card,
    onSurface: lightColors.text.primary,

    error: palette.error.light,

    // Add more mappings as needed
  },
  customColors: {
    status: {
      active: palette.brand[500],
      activeContainer: palette.brand[100],
      onActiveContainer: palette.brand[900],
      inactive: palette.neutral[500],
      inactiveContainer: palette.neutral[200],
      onInactiveContainer: palette.neutral[700],
    }
  }
};

export const mobileDarkTheme: AppTheme = {
  ...MD3DarkTheme,
  ...baseTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.brand.primary,
    onPrimary: palette.brand[900],
    primaryContainer: darkColors.brand.secondary,
    onPrimaryContainer: palette.brand[100],

    background: darkColors.background.page,
    surface: darkColors.background.card,
    onSurface: darkColors.text.primary,

    error: palette.error.dark,
  },
  customColors: {
    status: {
      active: palette.brand[400],
      activeContainer: palette.brand[900],
      onActiveContainer: palette.brand[100],
      inactive: palette.neutral[400],
      inactiveContainer: palette.neutral[700],
      onInactiveContainer: palette.neutral[100],
    }
  }
};
