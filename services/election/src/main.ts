// ============================================================
// VoteCapsule™ — Election Service Bootstrap
// services/election/src/main.ts
// Port 3011
// ============================================================
import { NestFactory }      from '@nestjs/core';
import { Logger }           from '@nestjs/common';
import { ElectionModule }   from './election.module';

async function bootstrap() {
  const app    = await NestFactory.create(ElectionModule);
  const logger = new Logger('Bootstrap');

  const port = process.env.PORT ?? 3011;

  // CORS — allow admin web and mobile gateway
  app.enableCors({
    origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(','),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-User-Id'],
  });

  app.setGlobalPrefix('api/v1/election');
  await app.listen(port);
  logger.log(`Election Service listening on port ${port}`);
}

bootstrap();
