import { useAuth } from './use-auth';
import { Role } from '@rootstock/iam/users/users-data-access';

export const usePermission = () => {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.roleId) return false;

    // Check if roleId is an object (populated)
    if (typeof user.roleId === 'string') {
      // If it's a string, we don't have permissions loaded.
      return false;
    }

    const role = user.roleId as Role;
    return role.permissions.includes(permission);
  };

  const can = (permission: string) => hasPermission(permission);

  return { hasPermission, can };
};
