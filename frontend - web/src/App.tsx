import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// routing
import router from 'routes';

// project imports
import NavigationScroll from 'layout/NavigationScroll';
import { MenuProvider } from 'contexts/MenuContext';
import { AuthProvider } from 'contexts/AuthContext';
import { SnackbarProvider } from 'contexts/SnackbarContext';

import ThemeCustomization from 'themes';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false
    }
  }
});

// ==============================|| APP ||============================== //

export default function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <QueryClientProvider client={queryClient}>
        <ThemeCustomization>
          <MenuProvider>
            <AuthProvider>
              <SnackbarProvider>
                <NavigationScroll>
                  <>
                    <RouterProvider router={router} />
                  </>
                </NavigationScroll>
              </SnackbarProvider>
            </AuthProvider>
          </MenuProvider>
        </ThemeCustomization>
      </QueryClientProvider>
    </LocalizationProvider>
  );
}
