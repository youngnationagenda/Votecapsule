/**
 * Vote Capsule™ Identity Service — Database Module
 *
 * Provides a shared pg.Pool instance to all service modules.
 */

import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const DATABASE_POOL = 'DATABASE_POOL';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: (configService: ConfigService): Pool => {
        return new Pool({
          host: configService.getOrThrow<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT', 5432),
          database: configService.getOrThrow<string>('DB_NAME'),
          user: configService.getOrThrow<string>('DB_USER'),
          password: configService.getOrThrow<string>('DB_PASSWORD'),
          ssl: configService.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
          min: configService.get<number>('DB_POOL_MIN', 2),
          max: configService.get<number>('DB_POOL_MAX', 10),
          connectionTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_POOL],
})
export class DatabaseModule {}
