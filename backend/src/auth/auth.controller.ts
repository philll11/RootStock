import { Controller, Post, Body, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Logger } from 'nestjs-pino';

class LocalLoginDto {
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email: string;
}


@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  @Public()
  @Post('local/login')
  @HttpCode(HttpStatus.OK)
  async localLogin(@Body() body: LocalLoginDto) {
    // Conditional Module logic ensures auth module is not imported unless APP_ENV is 'local'.
    // This is a redundant check, but added here for extra safety.
    const appEnvFromConfig = this.configService.get<string>('APP_ENV');
    if (appEnvFromConfig !== 'local') {
      throw new NotFoundException('Local login is not enabled.');
    }
    return this.authService.localLogin(body.email);
  }
}