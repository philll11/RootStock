// frontend/libs/ui/theme/src/lib/typography.ts

export const typography = {
  fontFamily: {
    // System fonts for now, can be replaced with custom fonts later
    sans: 'System, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", Times, serif',
    mono: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  weights: {
    regular: '400',
    medium: '500',
    bold: '700',
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    display: 32,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 16,
  xl: 32,
  full: 9999,
};

export const iconSizes = {
  sm: 14, // Standard for specific actions
  md: 16, // Standard for button icons
  lg: 20, // Standard for navigation/headers
  xl: 24,
};
