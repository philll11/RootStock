import { Controller, Post, Get, UseGuards, Request, Res, Headers, HttpCode, HttpStatus, Logger, Body } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

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
    const loginResult = await this.authService.login(req.user);

    if (platform === 'mobile') {
      // Mobile: Return token in body (Client handles storage)
      return loginResult;
    } else {
      // Web: Set HttpOnly Cookie (Browser handles storage)
      const expiresInSeconds = parseInt(this.configService.get<string>('JWT_EXPIRES_IN_SECONDS', '86400'), 10);
      
      response.cookie('Authentication', loginResult.accessToken, {
        httpOnly: true,
        secure: process.env.APP_ENV !== 'local', // Secure in Prod
        sameSite: 'strict',
        path: '/',
        maxAge: expiresInSeconds * 1000,
      });

      // Return user info but NOT the token
      return { message: 'Login successful', user: req.user };
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    // Clear the cookie
    response.cookie('Authentication', '', {
      httpOnly: true,
      expires: new Date(0),
    });
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