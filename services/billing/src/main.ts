// ============================================================
// VoteCapsule — Billing Service Entry Point
// services/billing/src/main.ts
// Port: 3013
// ============================================================
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('BillingService');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  // Global prefix — matches ALB path routing /api/v1/billing/*
  app.setGlobalPrefix('api/v1/billing');

  const port = process.env['PORT'] ?? 3013;
  await app.listen(port);
  logger.log(`Billing Service running on port ${port}`);
}

bootstrap().catch((error: unknown) => {
  new Logger('BillingService').error('Failed to start', error);
  process.exit(1);
});
