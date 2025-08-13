import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../../users/schemas/user.schema';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the permissions required for the route, set by the @RequirePermission decorator.
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If the route has no @RequirePermission decorator, access is granted.
    if (!requiredPermissions) return true;

    // Get the user object attached to the request by the preceding JwtAuthGuard.
    const { user }: { user: User } = context.switchToHttp().getRequest();

    // The JwtAuthGuard should have populated the user with their role details.
    // If not, or if the role has no permissions, deny access.
    const userPermissions = (user.roleId as any)?.permissions;
    if (!userPermissions) return false;

    // The core logic: check if the user's permissions array includes EVERY required permission.
    const hasAllPermissions = requiredPermissions.every( (permission) => userPermissions.includes(permission) );

    if (hasAllPermissions) return true;

    // If the user is missing one or more permissions, throw a 403 Forbidden error.
    throw new ForbiddenException('You do not have the required permissions to perform this action.');
  }
}