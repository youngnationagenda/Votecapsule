import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const DATABASE_POOL = 'DATABASE_POOL';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: (config: ConfigService): Pool =>
        new Pool({
          host: config.getOrThrow<string>('DB_HOST'),
          port: config.get<number>('DB_PORT', 5432),
          database: config.getOrThrow<string>('DB_NAME'),
          user: config.getOrThrow<string>('DB_USER'),
          password: config.getOrThrow<string>('DB_PASSWORD'),
          ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : undefined,
          min: 2,
          max: 10,
          connectionTimeoutMillis: 30000,
        }),
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_POOL],
})
export class DatabaseModule {}
