import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

// project imports
import Loadable from 'ui-component/Loadable';
import MinimalLayout from 'layout/MinimalLayout';
import GuestGuard from 'utils/route-guard/GuestGuard';

// maintenance routing
const LoginPage = Loadable(lazy(() => import('views/pages/authentication/Login')));
const ForgotPasswordPage = Loadable(lazy(() => import('views/pages/authentication/ForgotPassword')));
const ResetPasswordPage = Loadable(lazy(() => import('views/pages/authentication/ResetPassword')));

// ==============================|| AUTHENTICATION ROUTING ||============================== //

const AuthenticationRoutes: RouteObject = {
  path: '/',
  element: (
    <GuestGuard>
      <MinimalLayout />
    </GuestGuard>
  ),
  children: [
    {
      path: '/pages/login',
      element: <LoginPage />
    },
    {
      path: '/pages/forgot-password',
      element: <ForgotPasswordPage />
    },
    {
      path: '/reset-password/:token',
      element: <ResetPasswordPage />
    },
    {
      path: '/pages/reset-password',
      element: <ResetPasswordPage />
    }
  ]
};

export default AuthenticationRoutes;
