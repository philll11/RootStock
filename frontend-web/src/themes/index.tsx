import { useMemo, ReactNode } from 'react';

// material-ui
import { createTheme, ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';

// project imports
import { CSS_VAR_PREFIX, DEFAULT_THEME_MODE } from 'config';
import CustomShadows from './custom-shadows';
import useConfig from 'hooks/useConfig';
import { buildPalette } from './palette';
import Typography from './typography';
import componentsOverrides from './overrides'; // Note: overrides is still potentially JS/JSX

// ==============================|| DEFAULT THEME - MAIN ||============================== //

interface ThemeCustomizationProps {
  children: ReactNode;
}

export default function ThemeCustomization({ children }: ThemeCustomizationProps) {
  const {
    state: { borderRadius, fontFamily, outlinedFilled, presetColor, mode }
  } = useConfig();

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const themeMode = mode === 'system' ? (prefersDarkMode ? 'dark' : 'light') : mode;

  const themePalette = useMemo(() => buildPalette(presetColor || 'default', themeMode), [presetColor, themeMode]);

  const themeTypography = useMemo(() => Typography(fontFamily), [fontFamily]);

  const themeOptions = useMemo(
    () => ({
      direction: 'ltr' as 'ltr',
      mixins: {
        toolbar: {
          minHeight: '48px',
          padding: '16px',
          '@media (min-width: 600px)': {
            minHeight: '48px'
          }
        }
      },
      typography: themeTypography,
      palette: themePalette.palette,
      // RE-ADDED: Enable CSS variables to populate theme.vars
      cssVariables: {
        cssVarPrefix: CSS_VAR_PREFIX,
      }
    }),
    [themeTypography, themePalette, themeMode]
  );

  const themes = createTheme(themeOptions as any);
  themes.components = useMemo(() => componentsOverrides(themes, borderRadius, outlinedFilled), [themes, borderRadius, outlinedFilled]);

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={themes}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
