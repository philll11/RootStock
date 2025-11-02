import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { Role } from '../roles/schemas/role.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async localLogin(email: string): Promise<{ accessToken: string }> {
    const user = await this.usersService.findOneByEmailAndPopulateRole(email);

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found.`);
    }
    
    if (!user.isActive || user.isDeleted || !user.roleId) {
      throw new UnauthorizedException('User account is not active or has no role.');
    }

    const payload = {
      email: user.email,
      sub: user.recordId, // Use recordId to be consistent with the Cognito flow
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}