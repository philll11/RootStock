import { Controller, Post, Get, UseGuards, Request, Res, Headers, HttpCode, HttpStatus, Logger, Body, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  @Get('profile')
  async getProfile(@Request() req) {
    // Fetch the full user object to ensure we have the latest preferences and data
    // req.user.id comes from the JWT payload (sub)
    return this.usersService.findOne(req.user.id, req.user);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('local/login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Request() req,
    @Res({ passthrough: true }) response: Response,
    @Headers('x-client-platform') platform: string = 'web',
  ) {
    const { accessToken, refreshToken } = await this.authService.login(req.user);

    if (platform === 'mobile') {
      // Mobile: Return tokens in body
      return { accessToken, refreshToken, user: req.user };
    } else {
      // Web: Set HttpOnly Cookies
      const accessExpiresIn = parseInt(this.configService.get<string>('JWT_EXPIRES_IN_SECONDS', '86400'), 10);
      const refreshExpiresIn = parseInt(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_SECONDS', '604800'), 10);
      
      response.cookie('Authentication', accessToken, {
        httpOnly: true,
        secure: process.env.APP_ENV !== 'local',
        sameSite: 'strict',
        path: '/',
        maxAge: accessExpiresIn * 1000,
      });

      response.cookie('Refresh', refreshToken, {
        httpOnly: true,
        secure: process.env.APP_ENV !== 'local',
        sameSite: 'strict',
        path: '/auth/refresh', // Limit scope
        maxAge: refreshExpiresIn * 1000,
      });

      return { message: 'Login successful', user: req.user };
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Request() req,
    @Res({ passthrough: true }) response: Response,
    @Body('refreshToken') bodyRefreshToken?: string,
    @Headers('x-client-platform') platform: string = 'web',
  ) {
    // Get token from Cookie (Web) or Body (Mobile)
    const refreshToken = platform === 'mobile' ? bodyRefreshToken : req.cookies['Refresh'];

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);

    if (platform === 'mobile') {
      return tokens;
    } else {
      const accessExpiresIn = parseInt(this.configService.get<string>('JWT_EXPIRES_IN_SECONDS', '86400'), 10);
      const refreshExpiresIn = parseInt(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_SECONDS', '604800'), 10);

      response.cookie('Authentication', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.APP_ENV !== 'local',
        sameSite: 'strict',
        path: '/',
        maxAge: accessExpiresIn * 1000,
      });

      response.cookie('Refresh', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.APP_ENV !== 'local',
        sameSite: 'strict',
        path: '/auth/refresh',
        maxAge: refreshExpiresIn * 1000,
      });

      return { message: 'Token refreshed' };
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() requestingUser: UserDocument, 
    @Res({ passthrough: true }) response: Response,
    @Request() req,
    @Body('refreshToken') bodyRefreshToken?: string,
  ) {
    const refreshToken = bodyRefreshToken || req.cookies['Refresh'];

    // 1. Invalidate tokens
    await this.authService.logout(requestingUser.id, refreshToken);

    // 2. Clear cookies
    response.cookie('Authentication', '', { httpOnly: true, expires: new Date(0) });
    response.cookie('Refresh', '', { httpOnly: true, expires: new Date(0), path: '/auth/refresh' });
    
    return { message: 'Logged out' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    await this.authService.forgotPassword(email);
    return { message: 'If an account with that email exists, we have sent a password reset link.' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: { token: string; newPassword: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.resetPassword(body.token, body.newPassword);

    // Clear the cookie to prevent stale session 401s
    response.cookie('Authentication', '', {
      httpOnly: true,
      expires: new Date(0),
    });

    return { message: 'Password has been successfully reset.' };
  }
}