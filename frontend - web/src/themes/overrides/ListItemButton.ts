// ==============================|| OVERRIDES - LIST ITEM BUTTON ||============================== //

export default function ListItemButton(theme: any) {
  return {
    MuiListItemButton: {
      styleOverrides: {
        root: {
          color: theme.vars.palette.text.primary,
          paddingTop: '10px',
          paddingBottom: '10px',

          '&.Mui-selected': {
            color: theme.vars.palette.secondary.dark,
            backgroundColor: theme.vars.palette.secondary.light,
            '&:hover': {
              backgroundColor: theme.vars.palette.secondary.light
            },
            '& .MuiListItemIcon-root': {
              color: theme.vars.palette.secondary.dark
            },
            '& .MuiTypography-root': {
                fontWeight: 600
            },
            
            // Dark mode overrides
            // User requested light purple styling even in dark mode for high contrast selection
            ...(theme.palette.mode === 'dark' && {
                 color: theme.vars.palette.secondary.dark,
                 backgroundColor: theme.vars.palette.secondary.light,
                 '&:hover': {
                    backgroundColor: theme.vars.palette.secondary.light
                 },
                 '& .MuiListItemIcon-root': {
                    color: theme.vars.palette.secondary.dark
                 },
                 '& .MuiTypography-root': {
                    color: theme.vars.palette.secondary.dark,
                    fontWeight: 600
                 }
            }),
          },

          '&:hover': {
            backgroundColor: theme.vars.palette.secondary.light,
            color: theme.vars.palette.secondary.dark,
            '& .MuiListItemIcon-root': {
              color: theme.vars.palette.secondary.dark
            },
             // Dark mode hover
             ...(theme.palette.mode === 'dark' && {
                backgroundColor: theme.vars.palette.secondary.light,
                color: theme.vars.palette.secondary.dark,
                '& .MuiListItemIcon-root': {
                   color: theme.vars.palette.secondary.dark
                },
                 '& .MuiTypography-root': {
                    color: theme.vars.palette.secondary.dark
                 }
             })
          }
        }
      }
    }
  };
}
