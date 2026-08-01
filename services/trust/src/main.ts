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
  logger.log(`Hedera Network: ${process.env.HEDERA_NETWORK ?? 'testnet'}`);
  logger.log(`RFC 3161 TSA: ${process.env.TSA_URL ?? 'https://freetsa.org/tsr'}`);
  logger.log(`Merkle Batch Interval: ${process.env.MERKLE_BATCH_INTERVAL_MS ?? '60000'}ms`);
}
bootstrap();
