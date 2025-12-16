import { Injectable, NotFoundException, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { Role } from '../roles/schemas/role.schema';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
      tokenVersion: user.tokenVersion || 0,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.invalidateTokens(userId);
  }

  async forgotPassword(email: string): Promise<void> {
    // 1. Find user
    const user = await this.usersService.findOneByEmailAndPopulateRole(email);
    if (!user) {
      // Security: Don't reveal if user exists or not
      return;
    }

    // 2. Generate and Hash Token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // 3. Set Expiration (e.g., 10 minutes)
    const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

    // 4. Save to User
    await this.usersService.setPasswordResetToken(user.id, passwordResetToken, passwordResetExpires);

    // 5. Mock Email Sending
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
    
    Logger.log(`
      ========================================================
      EMAIL MOCK: Password Reset
      To: ${email}
      Subject: Your password reset token (valid for 10 min)
      
      Click here: ${resetUrl}
      ========================================================
    `);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // 1. Hash the incoming token to compare with DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Find user by token and check expiration
    const user = await this.usersService.findByPasswordResetToken(hashedToken);

    if (!user) {
      throw new BadRequestException('Token is invalid or has expired');
    }

    // 3. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update password and clear token
    await this.usersService.updatePasswordAndClearToken(user.id, hashedPassword);
  }
}