// ==============================|| OVERRIDES - MENU ITEM ||============================== //

export default function MenuItem(theme: any) {
  return {
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: theme.vars.palette.primary.light,
            // In dark mode, ensure text is readable against the hover background
            // Use standard light purple for consistency requested by user
            ...(theme.palette.mode === 'dark' && {
                backgroundColor: theme.vars.palette.primary.light,
                color: theme.vars.palette.primary.dark,
                 // Force Typography children to also update color
                 '& .MuiTypography-root': {
                    color: theme.vars.palette.primary.dark
                 },
            }),
          },
          '&.Mui-selected': {
             backgroundColor: theme.vars.palette.primary.light,
             color: theme.vars.palette.primary.dark,
             '&:hover': {
                backgroundColor: theme.vars.palette.primary.light,
             },
             '& .MuiTypography-root': {
                 fontWeight: 600
             },
             // Dark mode specific overrides for selected items
             ...(theme.palette.mode === 'dark' && {
                backgroundColor: theme.vars.palette.primary.light,
                color: theme.vars.palette.primary.dark,
                 '&:hover': {
                    backgroundColor: theme.vars.palette.primary.light,
                 },
                 '& .MuiTypography-root': {
                    color: theme.vars.palette.primary.dark,
                    fontWeight: 600
                 },
             }),
          }
        }
      }
    }
  };
}
