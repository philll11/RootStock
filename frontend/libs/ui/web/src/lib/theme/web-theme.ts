import { createTheme, MantineThemeOverride } from '@mantine/core';
import { palette, typography, spacing, radius, zIndex, shadows } from '@rootstock/ui/theme';

const brandColors = Object.values(palette.brand) as [
  string, string, string, string, string, string, string, string, string, string
];

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
  components: {
    Button: {
      defaultProps: {
        size: 'sm',
        radius: 'md',
      },
    },
    ActionIcon: {
      defaultProps: {
        size: 'lg',
        variant: 'subtle',
      },
    },
    Badge: {
      defaultProps: {
        size: 'sm',
        radius: 'sm',
      },
    },
    Table: {
      defaultProps: {
        verticalSpacing: 'sm',
        highlightOnHover: true,
      },
    },
    Modal: {
      defaultProps: {
        zIndex: zIndex.modal,
        shadow: shadows.lg,
      },
    },
    Drawer: {
      defaultProps: {
        zIndex: zIndex.drawer,
        shadow: shadows.xl,
        overlayProps: { opacity: 0.5, blur: 2 },
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