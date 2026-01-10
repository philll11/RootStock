import { Navigate, Outlet } from 'react-router-dom';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';

interface ProtectedRouteProps {
  permission: string;
  redirectPath?: string;
  children?: React.ReactNode;
}

export function ProtectedRoute({ permission, redirectPath = '/permission-denied', children }: ProtectedRouteProps) {
  const { hasPermission } = usePermission();

  if (!hasPermission(permission)) {
    return <Navigate to={redirectPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
