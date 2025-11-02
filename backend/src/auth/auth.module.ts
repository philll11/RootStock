import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const authStrategy = configService.get<string>('AUTH_STRATEGY');
        const secret = authStrategy === 'local'
            ? configService.get<string>('JWT_SECRET')
            : configService.get<string>('COGNITO_CLIENT_SECRET');
        
        return {
          secret: secret,
          signOptions: { expiresIn: '8h' },
        };
      },
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard],
  exports: [PassportModule, JwtAuthGuard],
})
export class AuthModule {}