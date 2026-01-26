// ==============================|| OVERRIDES - TABLE CELL ||============================== //

export default function TableCell(theme: any) {
  return {
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: theme.vars.palette.divider,

          '&.MuiTableCell-head': {
            fontSize: '0.875rem',
            color: theme.vars.palette.text.dark,
            fontWeight: 500
          }
        }
      }
    }
  };
}
