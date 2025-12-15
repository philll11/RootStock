// frontend/apps/web/src/app/app.tsx
import { Route, Routes, Navigate } from 'react-router-dom';
import { MantineProvider, Loader, Center } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

// Features
import { LoginPage, ForgotPasswordPage, ResetPasswordPage } from '@rootstock/auth/auth-feature-web';
import { DashboardPage } from './pages/dashboard-page';
import { UsersListPage, UserProfilePage } from '@rootstock/users/users-feature-web';
import { ClientsListPage } from '@rootstock/clients/clients-feature-web';
import { OrchardsListPage } from '@rootstock/orchards/orchards-feature-web';
import { RolesListPage } from '@rootstock/roles/roles-feature-web';
import { VarietiesListPage } from '@rootstock/master-data/varieties/varieties-feature-web';

// Layout & Components
import { MainLayout } from './layouts/main-layout';
import { ProtectedRoute } from './components/protected-route';
import { PermissionDeniedPage } from './pages/permission-denied-page';
import { ThemeController } from './theme-controller';

// Infrastructure
import { useAuth, setupAuthInterceptor } from '@rootstock/auth/auth-data-access';
import { webTheme } from '@rootstock/ui/web';
import { PERMISSIONS, notify } from '@rootstock/shared/util';
import { zIndex } from '@rootstock/ui/theme';

// Initialize Axios interceptors
setupAuthInterceptor(() => {
  notify.error('Your session has expired. Please log in again.', 'Session Expired');
});

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
      <MantineProvider theme={webTheme}>
        <ThemeController />
        <Notifications zIndex={zIndex.toast} />
        
        <Routes>
          <Route
            path="/login"
            element={<LoginPage />}
          />
          <Route
            path="/forgot-password"
            element={<ForgotPasswordPage />}
          />
          <Route
            path="/reset-password/:token"
            element={<ResetPasswordPage />}
          />
          <Route
            path="/permission-denied"
            element={<PermissionDeniedPage />}
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
            <Route 
              path="users" 
              element={
                <ProtectedRoute permission={PERMISSIONS.USER_VIEW}>
                  <UsersListPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="clients" 
              element={
                <ProtectedRoute permission={PERMISSIONS.CLIENT_VIEW}>
                  <ClientsListPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="orchards" 
              element={
                <ProtectedRoute permission={PERMISSIONS.ORCHARD_VIEW}>
                  <OrchardsListPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="roles" 
              element={
                <ProtectedRoute permission={PERMISSIONS.ROLE_VIEW}>
                  <RolesListPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="varieties" 
              element={
                <ProtectedRoute permission={PERMISSIONS.VARIETY_VIEW}>
                  <VarietiesListPage />
                </ProtectedRoute>
              } 
            />
            <Route path="profile" element={<UserProfilePage />} />
          </Route>
        </Routes>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;