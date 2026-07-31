// ============================================================
// VoteCapsule™ — Candidate Service Entry Point
// candidate-service/src/main.ts
//
// Port: 3009
// ============================================================
import { NestFactory }        from '@nestjs/core';
import { ValidationPipe }     from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { AppModule }          from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port   = config.get<number>('PORT', 3009);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:           true,
      forbidNonWhitelisted: true,
      transform:           true,
    }),
  );

  app.enableCors({
    origin: config.get('ALLOWED_ORIGINS', 'http://localhost:3000'),
  });

  await app.listen(port);
  console.log(`[CandidateService] Running on port ${port}`);
}

bootstrap();
