/**
 * Vote Capsule™ Tenant Service — Entry Point
 * Port: 3002
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap(): Promise<void> {
  const logger = new Logger('TenantService');
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1/tenant');

  const config = new DocumentBuilder()
    .setTitle('Vote Capsule™ Tenant Service')
    .setDescription('Manages organizations, members, subscriptions, and tenant settings.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
    .addTag('tenants', 'Tenant management')
    .addTag('members', 'Tenant member management')
    .addTag('subscriptions', 'Subscription management')
    .build();

  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env['PORT'] ?? 3002;
  await app.listen(port);
  logger.log(`Tenant Service running on port ${port}`);
}

bootstrap().catch((error: unknown) => {
  new Logger('TenantService').error('Failed to start', error);
  process.exit(1);
});
