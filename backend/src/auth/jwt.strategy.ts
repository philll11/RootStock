import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly usersService: UsersService,
        private readonly configService: ConfigService,
    ) {
        const secret = configService.get<string>('COGNITO_CLIENT_SECRET');
        if (!secret) throw new Error('JWT secret key is not defined in environment variables. Application cannot start.');

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            // IMPORTANT: In a real Cognito setup, this would use jwks-rsa
            // to dynamically fetch the public key from the JWKS URI.
            // For now, we'll use a placeholder from an environment variable.
            secretOrKey: secret,
        });
    }

    /**
     * This method is called by Passport after successfully verifying the JWT.
     * It receives the decoded payload and must return the user object.
     * NestJS will automatically attach this return value to `req.user`.
     * @param payload The decoded JWT payload (e.g., { sub, email, ... })
     */
    async validate(payload: any): Promise<User> {
        // The `sub` claim from Cognito typically holds the user's unique identifier.
        // We'll assume the `recordId` in our User schema matches Cognito's `sub`.
        const { sub } = payload;
        if (!sub) {
            throw new UnauthorizedException('JWT payload missing subject.');
        }

        // Fetch the user from the DB. Critically, we populate the 'roleId'
        // to get the full role object, including visibilityScope.
        const user = await this.usersService.findOneByRecordIdAndPopulateRole(sub);

        if (!user) {
            throw new UnauthorizedException('User not found.');
        }

        // Check the conditions enforced by the Post Authentication Lambda
        if (user.isDeleted || !user.isActive || !user.roleId) {
            throw new UnauthorizedException('User is inactive, deleted, or has no assigned role.');
        }

        return user;
    }
}