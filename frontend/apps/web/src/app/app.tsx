import { Route, Routes, Navigate } from 'react-router-dom';
import { MantineProvider, Loader, Center } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { LoginPage } from '@rootstock/auth/feature-login';
import { DashboardPage } from './pages/dashboard-page';
import { UsersListPage } from '@rootstock/users/feature-users';
import { ClientsListPage } from '@rootstock/clients/feature-clients';
import { MainLayout } from './layouts/main-layout';
import { useAuth, setupAuthInterceptor } from '@rootstock/auth/data-access';
import { theme } from '@rootstock/ui';

// Initialize Axios interceptors
setupAuthInterceptor();

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <Notifications zIndex={10000} />
        <Routes>
          <Route
            path="/login"
            element={<LoginPage />}
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <MainLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersListPage />} />
            <Route path="clients" element={<ClientsListPage />} />
          </Route>
        </Routes>
      </MantineProvider>
    </QueryClientProvider>
  );
}


export default App;
