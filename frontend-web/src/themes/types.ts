
import { Theme as MuiTheme, ThemeOptions as MuiThemeOptions, Palette as MuiPalette, PaletteOptions as MuiPaletteOptions, PaletteColorOptions, PaletteColor } from '@mui/material/styles';

declare module '@mui/material/styles' {
    interface Theme {
        customShadows: CustomShadows;
        vars: any;
    }
    interface ThemeOptions {
        customShadows?: CustomShadows;
    }
    
    // Augmenting Palette
    interface Palette {
        orange: PaletteColor;
        dark: PaletteColor & { 800: string; 900: string };
    }
    interface PaletteOptions {
        orange?: PaletteColorOptions;
        dark?: PaletteColorOptions & { 800?: string; 900?: string };
    }

    interface TypographyVariants {
        commonAvatar: React.CSSProperties;
        smallAvatar: React.CSSProperties;
        mediumAvatar: React.CSSProperties;
        largeAvatar: React.CSSProperties;
    }

    interface TypographyVariantsOptions {
        commonAvatar?: React.CSSProperties;
        smallAvatar?: React.CSSProperties;
        mediumAvatar?: React.CSSProperties;
        largeAvatar?: React.CSSProperties;
    }

    // TypeText augmentation
    interface TypeText {
        dark: string;
        heading: string;
    }
}

export interface CustomShadows {
    z1: string;
    z8: string;
    z12: string;
    z16: string;
    z20: string;
    z24: string;
    primary: string;
    secondary: string;
    orange: string;
    success: string;
    warning: string;
    error: string;
}
