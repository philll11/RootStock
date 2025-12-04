import { createTheme, MantineThemeOverride } from '@mantine/core';
import { palette, lightColors, darkColors } from '@rootstock/ui/theme';
import { typography, spacing, radius } from '@rootstock/ui/theme';

// Helper to map our palette to Mantine's expected 10-shade array
// Mantine expects colors[5] or colors[6] to be the primary shade
const brandColors = Object.values(palette.brand) as [
  string, string, string, string, string, string, string, string, string, string
];

// Map neutral palette to Mantine's gray scale
// We skip neutral[0] (white) and neutral[950] to fit into 10 shades
const neutralColors = [
  palette.neutral[50],
  palette.neutral[100],
  palette.neutral[200],
  palette.neutral[300],
  palette.neutral[400],
  palette.neutral[500],
  palette.neutral[600],
  palette.neutral[700],
  palette.neutral[800],
  palette.neutral[900],
] as [string, string, string, string, string, string, string, string, string, string];

const errorGlowStyles = {
  input: {
    '&[data-invalid]': {
      boxShadow: '0 0 8px 1px var(--mantine-color-red-4)',
    },
  },
};

export const webTheme: MantineThemeOverride = createTheme({
  primaryColor: 'brand',
  colors: {
    brand: brandColors,
    neutral: neutralColors,
  },
  fontFamily: typography.fontFamily.sans,
  fontSizes: {
    xs: `${typography.sizes.xs}px`,
    sm: `${typography.sizes.sm}px`,
    md: `${typography.sizes.md}px`,
    lg: `${typography.sizes.lg}px`,
    xl: `${typography.sizes.xl}px`,
  },
  spacing: {
    xs: `${spacing.xs}px`,
    sm: `${spacing.sm}px`,
    md: `${spacing.md}px`,
    lg: `${spacing.lg}px`,
    xl: `${spacing.xl}px`,
  },
  radius: {
    xs: `${radius.xs}px`,
    sm: `${radius.sm}px`,
    md: `${radius.md}px`,
    lg: `${radius.lg}px`,
    xl: `${radius.xl}px`,
  },
  // We can add component defaults here later
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    TextInput: { styles: errorGlowStyles },
    PasswordInput: { styles: errorGlowStyles },
    Select: { styles: errorGlowStyles },
    NumberInput: { styles: errorGlowStyles },
    Textarea: { styles: errorGlowStyles },
    MultiSelect: { styles: errorGlowStyles },
  },
});
