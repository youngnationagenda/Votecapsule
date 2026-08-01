// ============================================================
// VoteCapsule — Notification Service App Module
// ============================================================
import { HealthController } from './health.controller';
import { Module }          from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }   from '@nestjs/typeorm';

import { Notification }         from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';
import { NotificationDevice }   from './entities/notification-device.entity';
import { NotificationModule }   from './notification.module';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/audit.interceptor';
@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    TypeOrmModule.forRootAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        type:       'postgres',
        host:        config.get('DB_HOST', 'localhost'),
        port:        config.get<number>('DB_PORT', 5432),
        username:    config.get('DB_USER', 'postgres'),
        password:    config.get('DB_PASS', ''),
        database:    config.get('DB_NAME', 'votecapsule'),
        entities:    [
          Notification,
          NotificationTemplate,
          NotificationDelivery,
          NotificationDevice,
        ],
        synchronize: false,
        logging:     config.get('NODE_ENV') !== 'production',
        ssl:         config.get('DB_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),

    NotificationModule,
  ],
  providers: [
    {
      provide:  APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
