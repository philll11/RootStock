import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDocument } from '../../users/schemas/user.schema';

/**
 * Custom parameter decorator to extract the fully populated user object from the request.
 * Assumes that a preceding guard (e.g., JwtAuthGuard) has attached the user to the request.
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserDocument => {
    const request = ctx.switchToHttp().getRequest();
    // The user object is attached to the request by the authentication guard.
    return request.user;
  },
);