import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb', // blue-600
    },
    secondary: {
      main: '#7c3aed', // violet-600
    },
    error: {
      main: '#dc2626', // red-600
    },
    success: {
      main: '#16a34a', // green-600
    },
    background: {
      default: '#f9fafb', // gray-50
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          overflowX: 'auto',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          minWidth: 'auto',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          whiteSpace: 'nowrap',
          '@media (max-width: 600px)': {
            padding: '8px 8px',
            fontSize: '0.875rem',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          '@media (max-width: 600px)': {
            margin: 16,
            width: 'calc(100% - 32px)',
            maxHeight: 'calc(100% - 32px)',
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            padding: '16px',
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            padding: '8px 16px 16px',
            flexDirection: 'column',
            '& > :not(:first-of-type)': {
              marginLeft: 0,
              marginTop: 8,
            },
            '& .MuiButton-root': {
              width: '100%',
            },
          },
        },
      },
    },
  },
});
