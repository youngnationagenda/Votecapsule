// ============================================================
// VoteCapsule — Trust Service Root Module
// services/trust/src/app.module.ts
// ============================================================
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrustModule }       from './trust.module';
import { TrustAnchor }       from './entities/trust-anchor.entity';
import { TrustVerification } from './entities/trust-verification.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports:  [ConfigModule],
      inject:   [ConfigService],
      useFactory: (config: ConfigService) => ({
        type:        'postgres',
        host:        config.get('DB_HOST',     'localhost'),
        port:        config.get<number>('DB_PORT', 5432),
        username:    config.get('DB_USER',     'votecapsule'),
        password:    config.get('DB_PASSWORD', ''),
        database:    config.get('DB_NAME',     'votecapsule'),
        schema:      config.get('DB_SCHEMA',   'public'),
        entities:    [TrustAnchor, TrustVerification],
        synchronize: false,
        ssl:         config.get('DB_SSL') === 'true'
                       ? { rejectUnauthorized: false }
                       : false,
        extra: {
          max: parseInt(config.get('DB_POOL_MAX', '10'), 10),
        },
      }),
    }),

    TrustModule,
  ],
})
export class AppModule {}
