// ============================================================
// VoteCapsule — Evidence Service Entry Point
// services/evidence/src/main.ts
// ============================================================
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Evidence Service');
  const app = await NestFactory.create(AppModule);

  // Global validation pipe — enforces all DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist:        true,
    forbidNonWhitelisted: true,
    transform:        true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // All routes prefixed with /api/v1
  app.setGlobalPrefix('api/v1/evidence');

  // CORS — restricted to known origins in production
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3005;
  await app.listen(port);
  logger.log(`Evidence Service running on port ${port}`);
  logger.log(`API base: http://localhost:${port}/api/v1/evidence`);
}
bootstrap();
