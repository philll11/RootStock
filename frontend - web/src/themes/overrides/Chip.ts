// project imports
import { withAlpha } from 'utils/colorUtils';

// ===============================||  OVERRIDES - CHIP  ||=============================== //

export default function Chip(theme: any) {
  return {
    MuiChip: {
      defaultProps: {
        color: 'primary',
        variant: 'light'
      },
      styleOverrides: {
        root: {
          variants: [
            {
              props: { variant: 'light' }, // Variant for light Chip
              style: ({ ownerState, theme }: { ownerState: any; theme: any }) => {
                // Make sure color exists and is a key of palette
                const colorKey = ownerState.color;
                const paletteColor = theme.vars.palette[colorKey];

                const isDark = theme.palette.mode === 'dark';

                if (!paletteColor) return {};

                // Base Colors
                let textColor = paletteColor.main;
                let bgColor = paletteColor.light;

                // Adjust for Dark Mode
                if (isDark) {
                   textColor = paletteColor.light;
                   bgColor = withAlpha(paletteColor.main, 0.2); // Translucent Main Color for darker BG
                }

                return {
                  color: textColor,
                  backgroundColor: bgColor,

                  ...(ownerState.color === 'error' && {
                    backgroundColor: isDark ? withAlpha(paletteColor.main, 0.25) : withAlpha(paletteColor.light, 0.25)
                  }),
                  ...((ownerState.color === 'success' || ownerState.color === 'warning' || ownerState.color === 'info') && {
                    backgroundColor: isDark ? withAlpha(paletteColor.main, 0.2) : withAlpha(paletteColor.light, 0.5),
                    color: isDark ? paletteColor.light : paletteColor.dark
                  }),

                  '&.MuiChip-clickable': {
                    '&:hover': {
                      color: paletteColor.light,
                      backgroundColor: paletteColor.dark
                    }
                  }
                };
              }
            },
            {
              props: { variant: 'outlined', color: 'warning' },
              style: {
                borderColor: theme.vars.palette.warning.dark,
                color: theme.vars.palette.warning.dark
              }
            },
            {
              props: { variant: 'outlined', color: 'success' },
              style: {
                borderColor: theme.vars.palette.success.dark,
                color: theme.vars.palette.success.dark
              }
            }
          ],
          '&.MuiChip-deletable .MuiChip-deleteIcon': {
            color: 'inherit'
          }
        }
      }
    }
  };
}
