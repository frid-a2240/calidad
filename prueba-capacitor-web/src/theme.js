import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0d3b66',       // Azul ISP profundo
      light: '#3a5f8a',
      dark: '#062040',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#00a99d',       // Turquesa institucional (PANTONE 326)
      light: '#4dc3b8',
      dark: '#00847a',
      contrastText: '#ffffff',
    },
    success: {
      main: '#1a9c72',
      light: '#e3f5ed',
      dark: '#0f7a58',
      contrastText: '#ffffff',
    },
    error: {
      main: '#c62828',
      light: '#fbe9e9',
    },
    warning: {
      main: '#c2820f',
      light: '#fdf3de',
    },
    info: {
      main: '#3a6fa5',
      light: '#e8f0fa',
    },
    background: {
      default: '#eef1f6',    // Gris azulado claro de fondo
      paper: '#ffffff',
    },
    text: {
      primary: '#161e2c',
      secondary: '#5a6a7e',
    },
    divider: '#e2e6ed',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle2: { fontWeight: 700 },
    body2: { color: '#5a6a7e' },
    overline: { letterSpacing: '0.06em' },
    button: {
      textTransform: 'none',
      fontWeight: 650,
      letterSpacing: 0,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            'radial-gradient(circle at 100% 0%, rgba(0,169,157,0.06), transparent 45%), radial-gradient(circle at 0% 0%, rgba(13,59,102,0.05), transparent 40%)',
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 2px rgba(20, 30, 45, 0.04), 0 8px 24px -12px rgba(13, 59, 102, 0.14)',
          border: '1px solid #e2e6ed',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: '#e2e6ed',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 9,
        },
        containedPrimary: {
          boxShadow: '0 2px 10px -2px rgba(13, 59, 102, 0.45)',
          '&:hover': {
            boxShadow: '0 4px 14px -2px rgba(13, 59, 102, 0.5)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          borderRadius: 9,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 9,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 650,
          borderRadius: 7,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#5a6a7e',
          backgroundColor: '#f6f8fb',
          borderBottom: '1px solid #e2e6ed',
        },
        root: {
          borderColor: '#e9ecf1',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-of-type td': {
            borderBottom: 0,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          fontWeight: 650,
          fontSize: '0.9rem',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
        },
      },
    },
  },
})
