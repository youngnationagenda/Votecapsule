/**
 * Vote Capsule™ Audit Service
 *
 * Entry point for the Audit microservice.
 * Manages compliance logging, security events, access audit trail.
 *
 * Port: 3012 (default)
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('AuditService');
  const app = await NestFactory.create(AppModule);

  // Global validation pipe — strict validation, whitelist unknown fields
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

  // CORS
  app.enableCors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  // Global prefix — matches ALB path routing /api/v1/audit/*
  app.setGlobalPrefix('api/v1/audit');

  const port = process.env['PORT'] ?? 3012;
  await app.listen(port);

  logger.log(`Audit Service running on port ${port}`);
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('AuditService');
  logger.error('Failed to start Audit Service', error);
  process.exit(1);
});
