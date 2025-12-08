// backend/src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.use(cookieParser());

  const configService = app.get(ConfigService); // Get ConfigService early

  // --- ENABLE CORS ---
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (corsOrigin) {
    const origins = corsOrigin.includes(',') ? corsOrigin.split(',').map(o => o.trim()) : corsOrigin;
    app.enableCors({
      origin: origins,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
    const logger = app.get(Logger);
    logger.log(`CORS enabled for origin(s): ${origins}`);
  }

  app.useLogger(app.get(Logger));

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('RootStock API')
    .setDescription('The official API documentation for the RootStock platform.')
    .setVersion('1.0')
    .addTag('rootstock') // A tag for grouping endpoints
    .addBearerAuth() // If you use Bearer tokens for auth, this is crucial
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);


  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  const logger = app.get(Logger);

  logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();