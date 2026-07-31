// ============================================================
// VoteCapsule — AI Service Entry Point
// services/ai/src/main.ts
// Port: 3006
// ============================================================
import { NestFactory }        from '@nestjs/core';
import { ValidationPipe }     from '@nestjs/common';
import { AppModule }          from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  const port = process.env['PORT'] ?? 3006;
  await app.listen(port);
  console.log(`AI Verification Service running on port ${port}`);
  console.log(`API base: http://localhost:${port}/api/v1/ai`);
  console.log('AI ASSISTS, HUMANS DECIDE — no automated final decisions');
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal error starting AI Service:', err);
  process.exit(1);
});
