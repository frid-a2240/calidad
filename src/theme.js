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
      main: '#00a99d',
    },
    error: {
      main: '#c62828',
    },
    warning: {
      main: '#e6a817',
    },
    background: {
      default: '#f4f6f9',    // Gris muy claro de fondo
      paper: '#ffffff',
    },
    text: {
      primary: '#1a2332',
      secondary: '#5a6a7e',
    },
    divider: '#e2e6ed',
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    h5: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 600 },
    body2: { color: '#5a6a7e' },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: 0,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(13, 59, 102, 0.08)',
          border: '1px solid #e2e6ed',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
})