import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { useContainer } from 'class-validator';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import mongoose, { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

/**
 * Sets up a full NestJS application instance for end-to-end testing,
 * precisely mirroring the project's established E2E test configuration.
 * @returns An object containing the app, mongod, and jwtService instances.
 */
export const setupTestApp = async (): Promise<{
  app: INestApplication;
  mongod: MongoMemoryReplSet;
  jwtService: JwtService;
}> => {
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, dbName: 'jest' } });
  const uri = mongod.getUri();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, envFilePath: './test/.env.test' }),
      MongooseModule.forRoot(uri),
      AppModule,
      JwtModule.registerAsync({
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          secret: configService.get<string>('COGNITO_CLIENT_SECRET'),
          signOptions: { expiresIn: '1h' },
        }),
        inject: [ConfigService],
      }),
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();

  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  const jwtService = moduleFixture.get<JwtService>(JwtService);
  return { app, mongod, jwtService };
};

/**
 * Tears down the test application and stops the in-memory database gracefully.
 */
export const teardownTestApp = async (options: {
  app: INestApplication;
  mongod: MongoMemoryReplSet;
}): Promise<void> => {
  if (options.app) {
    await options.app.close();
  }

  await mongoose.disconnect();

  if (options.mongod) {
    await options.mongod.stop();
  }
};