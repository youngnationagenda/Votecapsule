// ============================================================
// VoteCapsule — Geography Service Root Module
// services/geography/src/app.module.ts
// ============================================================
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeographyModule }     from './geography.module';
import { County }              from './entities/county.entity';
import { Constituency }        from './entities/constituency.entity';
import { Ward }                from './entities/ward.entity';
import { RegistrationCentre }  from './entities/registration-centre.entity';
import { PollingStation }      from './entities/polling-station.entity';
import { ElectionVersion }     from './entities/election-version.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:     config.get<string>('DB_HOST',     'localhost'),
        port:     config.get<number>('DB_PORT',     5432),
        username: config.get<string>('DB_USER',     'votecapsule'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_NAME',     'votecapsule'),
        schema:   config.get<string>('DB_SCHEMA',   'public'),
        entities: [
          County,
          Constituency,
          Ward,
          RegistrationCentre,
          PollingStation,
          ElectionVersion,
        ],
        // Migrations are managed via packages/database/migrations/nec/
        synchronize: false,
        ssl: config.get<string>('DB_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
        extra: {
          max: parseInt(config.get<string>('DB_POOL_MAX', '10'), 10),
          idleTimeoutMillis: 30000,
        },
        logging: config.get<string>('NODE_ENV') === 'development' ? ['error'] : false,
      }),
    }),

    GeographyModule,
  ],
})
export class AppModule {}
