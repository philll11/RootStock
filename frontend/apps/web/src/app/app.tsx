// frontend/apps/web/src/app/app.tsx
import { Route, Routes, Navigate } from 'react-router-dom';
import { MantineProvider, Loader, Center } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';

// Features
import { LoginPage, ForgotPasswordPage, ResetPasswordPage } from '@rootstock/iam/auth/auth-feature-web';
import { DashboardPage } from './pages/dashboard-page';
import { 
  UsersListPage, 
  UserProfilePage,
  UserCreatePage,
  UserEditPage,
  UserViewPage
} from '@rootstock/iam/users/users-feature-web';
import { 
  ClientsListPage,
  ClientCreatePage,
  ClientEditPage,
  ClientViewPage
} from '@rootstock/iam/clients/clients-feature-web';
import { 
  OrchardsListPage,
  OrchardCreatePage,
  OrchardEditPage,
  OrchardViewPage
} from '@rootstock/assets/orchards/orchards-feature-web';
import { 
  BlocksListPage,
  BlockCreatePage,
  BlockEditPage,
  BlockViewPage
} from '@rootstock/assets/blocks/blocks-feature-web';
import { 
  RolesListPage,
  RoleCreatePage,
  RoleEditPage,
  RoleViewPage
} from '@rootstock/iam/roles/roles-feature-web';
import { 
  VarietiesListPage,
  VarietyCreatePage,
  VarietyEditPage,
  VarietyViewPage
} from '@rootstock/master-data/varieties/varieties-feature-web';
import { 
  AssessmentListPage,
  AssessmentCreatePage,
  AssessmentEditPage,
  AssessmentViewPage
} from '@rootstock/operations/assessments/assessments-feature-web';

// Layout & Components
import { MainLayout } from './layouts/main-layout';
import { ProtectedRoute } from './components/protected-route';
import { PermissionDeniedPage } from './pages/permission-denied-page';
import { ThemeController } from './theme-controller';

// Infrastructure
import { useAuthSession, setupAuthInterceptor } from '@rootstock/iam/auth/auth-data-access';
import { webTheme } from '@rootstock/ui/web';
import { PERMISSIONS, notify } from '@rootstock/shared/util';
import { zIndex } from '@rootstock/ui/theme';

// Initialize Axios interceptors
setupAuthInterceptor(() => {
  notify.error('Your session has expired. Please log in again.', 'Session Expired');
});

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthSession();

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
            <Route path="users">
              <Route 
                index 
                element={
                  <ProtectedRoute permission={PERMISSIONS.USER_VIEW}>
                    <UsersListPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="new" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.USER_CREATE}>
                    <UserCreatePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":id" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.USER_VIEW}>
                    <UserViewPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":id/edit" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.USER_EDIT}>
                    <UserEditPage />
                  </ProtectedRoute>
                } 
              />
            </Route>
            <Route path="clients">
              <Route 
                index 
                element={
                  <ProtectedRoute permission={PERMISSIONS.CLIENT_VIEW}>
                    <ClientsListPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="new" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.CLIENT_CREATE}>
                    <ClientCreatePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":id" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.CLIENT_VIEW}>
                    <ClientViewPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":id/edit" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.CLIENT_EDIT}>
                    <ClientEditPage />
                  </ProtectedRoute>
                } 
              />
            </Route>
            <Route path="orchards">
              <Route 
                index 
                element={
                  <ProtectedRoute permission={PERMISSIONS.ORCHARD_VIEW}>
                    <OrchardsListPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="new" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.ORCHARD_CREATE}>
                    <OrchardCreatePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":id" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.ORCHARD_VIEW}>
                    <OrchardViewPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":id/edit" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.ORCHARD_EDIT}>
                    <OrchardEditPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":orchardId/blocks" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.BLOCK_VIEW}>
                    <BlocksListPage />
                  </ProtectedRoute>
                } 
              />
            </Route>
            <Route path="blocks">
              <Route 
                index 
                element={
                  <ProtectedRoute permission={PERMISSIONS.BLOCK_VIEW}>
                    <BlocksListPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="new" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.BLOCK_CREATE}>
                    <BlockCreatePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":id" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.BLOCK_VIEW}>
                    <BlockViewPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":id/edit" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.BLOCK_EDIT}>
                    <BlockEditPage />
                  </ProtectedRoute>
                } 
              />
            </Route>
            <Route path="assessments">
              <Route 
                index 
                element={
                  <ProtectedRoute permission={PERMISSIONS.ASSESSMENT_VIEW}>
                    <AssessmentListPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="new" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.ASSESSMENT_CREATE}>
                    <AssessmentCreatePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":id" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.ASSESSMENT_VIEW}>
                    <AssessmentViewPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":id/edit" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.ASSESSMENT_EDIT}>
                    <AssessmentEditPage />
                  </ProtectedRoute>
                } 
              />
            </Route>
            <Route path="roles">
              <Route 
                index 
                element={
                  <ProtectedRoute permission={PERMISSIONS.ROLE_VIEW}>
                    <RolesListPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="new" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.ROLE_CREATE}>
                    <RoleCreatePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":id" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.ROLE_VIEW}>
                    <RoleViewPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":id/edit" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.ROLE_EDIT}>
                    <RoleEditPage />
                  </ProtectedRoute>
                } 
              />
            </Route>
            <Route path="varieties">
              <Route 
                index 
                element={
                  <ProtectedRoute permission={PERMISSIONS.VARIETY_VIEW}>
                    <VarietiesListPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="new" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.VARIETY_CREATE}>
                    <VarietyCreatePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":id" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.VARIETY_VIEW}>
                    <VarietyViewPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path=":id/edit" 
                element={
                  <ProtectedRoute permission={PERMISSIONS.VARIETY_EDIT}>
                    <VarietyEditPage />
                  </ProtectedRoute>
                } 
              />
            </Route>
            <Route path="profile" element={<UserProfilePage />} />
          </Route>
        </Routes>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;