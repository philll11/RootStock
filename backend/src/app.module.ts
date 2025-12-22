// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule } from './iam/clients/clients.module';
import { UsersModule } from './iam/users/users.module';
import { RolesModule } from './iam/roles/roles.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './iam/auth/auth.module';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { JwtAuthGuard } from './iam/auth/jwt-auth.guard';
import { SubsidiariesModule } from './iam/subsidiaries/subsidiaries.module';
import { OrchardsModule } from './assets/orchards/orchards.module';
import { BlocksModule } from './assets/blocks/blocks.module';
import { AssessmentsModule } from './operations/assessments/assessments.module';
import { CountersModule } from './system/counters/counters.module';
import { VarietiesModule } from './master-data/varieties/varieties.module';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true, 
      ignoreEnvFile: process.env.APP_ENV === 'local' || process.env.APP_ENV === 'cloud',
      load: [appConfig],
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          // Use pino-pretty for local development for human-readable logs
          transport: configService.get<string>('NODE_ENV') !== 'production' ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
          level: configService.get<string>('LOG_LEVEL', 'info'), // Default to 'info'
          // Define custom log message format for requests
          customSuccessMessage: (req, res) => { return `Request ${req.id} finished with status ${res.statusCode}`; },
          customErrorMessage: (req, res, err) => { return `Request ${req.id} failed with status ${res.statusCode}: ${err.message}`; },
          serializers: {
            req: (req) => ({
              id: req.id,
              method: req.method,
              url: req.url,
              // body: req.raw.body, // Note: pino-http might not have body available depending on middleware order
            }),
            res: (res) => ({
              statusCode: res.statusCode,
            }),
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
    BlocksModule,
    AssessmentsModule,
    CountersModule,
    VarietiesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard, },
    { provide: APP_GUARD, useClass: PermissionsGuard, },
  ],
})
export class AppModule { }