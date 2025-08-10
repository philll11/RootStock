import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '../../users/schemas/user.schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // If no @Roles decorator is used, allow access.
    }

    const { user }: { user: User } = context.switchToHttp().getRequest();

    // If JwtAuthGuard didn't run or failed, there will be no user. Deny access.
    if (!user) {
      return false;
    }

    const userRoleName = (user.roleId as any)?.name;

    // If the user doesn't have a role name, deny access.
    if (!userRoleName) {
      return false;
    }

    // This is the correct logic: check if the user's actual role name is in the required list.
    return requiredRoles.includes(userRoleName);
  }
}