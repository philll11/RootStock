// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule } from './clients/clients.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { SubsidiariesModule } from './subsidiaries/subsidiaries.module';
import { OrchardsModule } from './orchards/orchards.module';
import { CountersModule } from './counters/counters.module';
import { LocalAuthModule } from './auth/local-auth.module';

// --- Conditional Module Logic ---
// Only import the LocalAuthModule if APP_ENV is set to 'local'.
// This allows us to keep development-only authentication code separate
// from production deployments that use Cognito or other strategies.
const developmentOnlyModules: any[] = [];
if (process.env.APP_ENV === 'local') {
  developmentOnlyModules.push(LocalAuthModule);
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          // Use pino-pretty for local development for human-readable logs
          transport: configService.get<string>('NODE_ENV') !== 'production' ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
          level: configService.get<string>('LOG_LEVEL', 'info'), // Default to 'info'
          // Define custom log message format for requests
          customSuccessMessage: (req, res) => {
            return `Request ${req.id} finished with status ${res.statusCode}`;
          },
          customErrorMessage: (req, res, err) => {
            return `Request ${req.id} failed with status ${res.statusCode}: ${err.message}`;
          },
          // This creates and adds the Correlation ID to every log
          genReqId: (req, res) => {
            const existingId = req.id ?? req.headers["x-request-id"];
            if (existingId) return existingId;
            const id = require('crypto').randomUUID();
            res.setHeader('X-Request-Id', id);
            return id;
          },
        },
      }),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuthModule,
    ClientsModule,
    UsersModule,
    RolesModule,
    SubsidiariesModule,
    OrchardsModule,
    CountersModule,
    ...developmentOnlyModules,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule { }