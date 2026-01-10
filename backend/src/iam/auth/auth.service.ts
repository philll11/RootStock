import { Injectable, NotFoundException, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { Role } from '../roles/schemas/role.schema';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.validateUser(email, pass);
    if (user) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    if (!user.isActive || user.isDeleted || !user.roleId) {
      throw new UnauthorizedException('User account is not active or has no role.');
    }

    const payload = {
      email: user.email,
      sub: user.recordId,
      tokenVersion: user.tokenVersion || 0,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user._id);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const tokenDoc = await this.refreshTokenModel.findOne({ tokenHash });

    if (!tokenDoc) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenDoc.isRevoked) {
      // Security: If a revoked token is used, it might be a theft.
      // We could invalidate all tokens for this user (familyId logic), but for now just reject.
      throw new UnauthorizedException('Refresh token revoked');
    }

    if (tokenDoc.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotation: Revoke the used token
    tokenDoc.isRevoked = true;
    await tokenDoc.save();

    // Get user to check status and generate new payload
    const user = await this.usersService.findOneById(tokenDoc.userId.toString());
    if (!user || !user.isActive || user.isDeleted) {
      throw new UnauthorizedException('User account is no longer active');
    }

    const payload = {
      email: user.email,
      sub: user.recordId,
      tokenVersion: user.tokenVersion || 0,
    };

    const accessToken = this.jwtService.sign(payload);
    const newRefreshToken = await this.generateRefreshToken(user._id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  private async generateRefreshToken(userId: any): Promise<string> {
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Default 7 days if not configured
    const ttlSeconds = parseInt(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_SECONDS', '604800'), 10);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.refreshTokenModel.create({
      tokenHash,
      userId,
      expiresAt,
    });

    return refreshToken;
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    // Hard logout (invalidate all sessions)
    await this.usersService.invalidateTokens(userId);

    // Also revoke the specific refresh token if provided
    if (refreshToken) {
       const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
       await this.refreshTokenModel.updateOne({ tokenHash }, { isRevoked: true });
    }
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