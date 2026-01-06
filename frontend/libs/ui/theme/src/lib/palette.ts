// frontend/libs/ui/theme/src/lib/palette.ts
export const palette = {
  // RootStock Green (Nature/Growth)
  brand: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Primary Brand Color
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  // Neutral Greys (Slate)
  neutral: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  // Semantic Colors
  error: {
    light: '#ef4444',
    dark: '#f87171',
  },
  warning: {
    light: '#f59e0b',
    dark: '#fbbf24',
  },
  success: {
    light: '#10b981',
    dark: '#34d399',
  },
  status: {
    pending: '#64748b', // neutral[500]
    inProgress: '#3b82f6', // blue[500]
    completed: '#22c55e', // brand[500]
  },
  state: {
    active: '#22c55e', // brand[500]
    inactive: '#64748b', // neutral[500]
  },
  icons: {
    create: '#4ade80', // brand[400]
    edit: '#f59e0b', // warning.light
    delete: '#ef4444', // error.light
    view: '#3b82f6', // blue
  },
  actions: {
    create: '#4ade80', // brand[400]
    update: '#3b82f6', // warning.light
    delete: '#ef4444', // error.light
  },
};

export const lightColors = {
  background: {
    page: palette.neutral[50],
    card: palette.neutral[0],
    modal: palette.neutral[0],
  },
  text: {
    primary: palette.neutral[900],
    secondary: palette.neutral[500],
    disabled: palette.neutral[300],
    inverse: palette.neutral[0],
  },
  brand: {
    primary: palette.brand[600],
    secondary: palette.brand[100],
    highlight: palette.brand[50],
  },
  border: palette.neutral[200],
};

export const darkColors = {
  background: {
    page: palette.neutral[950],
    card: palette.neutral[900],
    modal: palette.neutral[800],
  },
  text: {
    primary: palette.neutral[50],
    secondary: palette.neutral[400],
    disabled: palette.neutral[600],
    inverse: palette.neutral[900],
  },
  brand: {
    primary: palette.brand[500],
    secondary: palette.brand[900],
    highlight: palette.brand[900],
  },
  border: palette.neutral[800],
};
