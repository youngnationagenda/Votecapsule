// ============================================================
// VoteCapsule — Workflow Engine Entry Point
// services/workflow/src/main.ts
// Port: 3007
// ============================================================
import { NestFactory }    from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule }      from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('WorkflowEngine');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
      transformOptions:     { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  const port = process.env['PORT'] ?? 3007;
  await app.listen(port);
  logger.log(`Workflow Engine Service running on port ${port}`);
  logger.log(`API base: http://localhost:${port}/api/v1/workflow`);
  logger.log('EventBus: ' + (process.env['EVENT_BUS_NAME'] ?? 'votecapsule-events'));
}

bootstrap().catch((err: unknown) => {
  new Logger('WorkflowEngine').error('Fatal error starting Workflow Service:', err);
  process.exit(1);
});
