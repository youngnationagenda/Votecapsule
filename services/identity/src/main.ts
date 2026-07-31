/**
 * Vote Capsule™ Identity Service
 *
 * Entry point for the Identity microservice.
 * Manages users, authentication, roles, permissions, and devices.
 *
 * Port: 3001 (default)
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap(): Promise<void> {
  const logger = new Logger('IdentityService');
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(helmet());
  app.use(compression());

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

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // OpenAPI / Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Vote Capsule™ Identity Service')
    .setDescription(
      'Manages users, authentication, roles, permissions, devices, and invitations across the Vote Capsule™ platform.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'jwt',
    )
    .addTag('auth', 'Authentication — login, logout, MFA, token refresh')
    .addTag('users', 'User management — CRUD, profiles, devices')
    .addTag('roles', 'Role and permission management')
    .addTag('invitations', 'User invitation workflow')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);

  logger.log(`Identity Service running on port ${port}`);
  logger.log(`API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('IdentityService');
  logger.error('Failed to start Identity Service', error);
  process.exit(1);
});
