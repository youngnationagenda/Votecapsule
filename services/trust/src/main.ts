// ============================================================
// VoteCapsule — Trust Service Entry Point
// services/trust/src/main.ts
// ============================================================
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Trust Service');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist:            true,
    forbidNonWhitelisted: true,
    transform:            true,
    transformOptions:     { enableImplicitConversion: true },
  }));

  app.setGlobalPrefix('api/v1/trust');

  // Trust Service is internal — CORS restricted to other services
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  logger.log(`Trust Service running on port ${port}`);
  logger.log(`API base: http://localhost:${port}/api/v1/trust`);
  logger.log(`QLDB Ledger: ${process.env.QLDB_LEDGER_NAME ?? 'vote-capsule-trust'}`);
}
bootstrap();
