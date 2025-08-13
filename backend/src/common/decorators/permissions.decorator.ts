import { SetMetadata } from '@nestjs/common';

/**
 * The key used to store permission metadata on a route.
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * A decorator to attach required permissions to a route handler.
 * The PermissionsGuard will check these against the user's assigned role permissions.
 * @param permissions A list of permission strings required to access the endpoint.
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);