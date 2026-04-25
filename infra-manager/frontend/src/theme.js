import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1a237e',
    },
    secondary: {
      main: '#00796b',
    },
    status: {
      running: '#4caf50',
      up: '#4caf50',
      active: '#4caf50',
      stopped: '#f44336',
      down: '#f44336',
      inactive: '#f44336',
      warning: '#ff9800',
      starting: '#ff9800',
      stopping: '#ff9800',
      unknown: '#9e9e9e',
      planned: '#9e9e9e',
      error: '#b71c1c',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f5f5f5',
        },
      },
    },
  },
});

export default theme;
