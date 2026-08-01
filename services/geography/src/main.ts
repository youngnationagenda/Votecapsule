// ============================================================
// VoteCapsule — Geography Service Entry Point
// services/geography/src/main.ts
// Port: 3004
// ============================================================
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('GeographyService');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api/v1/geography');

  app.enableCors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  // OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Vote Capsule™ Geography Service — NEC')
    .setDescription(
      'National Election Core (NEC) Geography API. ' +
      'Single source of truth for all Kenya election geography. ' +
      '47 Counties → 290 Constituencies → 1,447 Wards → 27,363 Registration Centres → 45,897 Polling Stations.',
    )
    .setVersion('1.0')
    .addTag('NEC Geography', 'Kenya electoral geography hierarchy and polling station data')
    .build();

  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env['PORT'] ?? 3004;
  await app.listen(port);
  logger.log(`Geography Service (NEC) running on port ${port}`);
  logger.log(`API docs: http://localhost:${port}/api/docs`);
  logger.log(`Stats:    http://localhost:${port}/api/v1/geography/stats`);
}

bootstrap().catch((error: unknown) => {
  new Logger('GeographyService').error('Failed to start', error);
  process.exit(1);
});
