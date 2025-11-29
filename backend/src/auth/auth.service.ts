import { Injectable, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { Role } from '../roles/schemas/role.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.validateUser(email, pass);
    if (user) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(user: any): Promise<{ accessToken: string }> {
    if (!user.isActive || user.isDeleted || !user.roleId) {
      throw new UnauthorizedException('User account is not active or has no role.');
    }

    const payload = {
      email: user.email,
      sub: user.recordId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}