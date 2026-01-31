import { useGetProfile } from './use-auth';

export const usePermission = () => {
  const { data: user } = useGetProfile();

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.roleId) return false;

    // Check if roleId is an object (populated)
    if (typeof user.roleId === 'string') {
      // If it's a string, we don't have permissions loaded.
      return false;
    }

    // It's an object, so we access permissions safely
    return user.roleId.permissions?.includes(permission) ?? false;
  };

  const can = (permission: string) => hasPermission(permission);

  return { hasPermission, can };
};
