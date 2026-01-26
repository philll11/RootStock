export const DASHBOARD_PATH = '/';
export const DEFAULT_THEME_MODE = 'system';

export const CSS_VAR_PREFIX = '';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Config {
  fontFamily: string;
  borderRadius: number;
  outlinedFilled?: boolean;
  presetColor?: string;
  locale?: string;
  rtlLayout?: boolean;
  miniDrawer?: boolean;
  container?: boolean;
  mode: ThemeMode;
}

const config: Config = {
  fontFamily: `'Roboto', sans-serif`,
  borderRadius: 8,
  mode: 'system'
};

export default config;
