// ============================================================
// VoteCapsule — Notification Service Entry Point
// Port: 3008
// ============================================================
import { NestFactory }    from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule }      from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
    }),
  );

  app.setGlobalPrefix('api/v1/notification');

  const port = process.env.PORT ?? 3008;
  await app.listen(port);
  console.log(`Notification Service running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Fatal error starting Notification Service:', err);
  process.exit(1);
});
