import React from 'react';
import { usePermission } from '@rootstock/auth/auth-data-access';

interface WithPermissionProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const WithPermission = ({ permission, children, fallback = null }: WithPermissionProps) => {
  const { hasPermission } = usePermission();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
