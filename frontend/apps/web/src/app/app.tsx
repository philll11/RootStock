import { Route, Routes, Navigate } from 'react-router-dom';
import { MantineProvider, Loader, Center } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mantine/core/styles.css';
import { LoginPage } from './pages/login-page';
import { DashboardPage } from './pages/dashboard-page';
import { useAuth } from '@rootstock/core';

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: JSX.Element }) {
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
      <MantineProvider>
        <Routes>
          <Route
            path="/"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/login"
            element={<LoginPage />}
          />
        </Routes>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
