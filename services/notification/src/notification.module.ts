// ============================================================
// VoteCapsule — Notification Module
// ============================================================
import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { ConfigModule }    from '@nestjs/config';
import { HttpModule }      from '@nestjs/axios';

import { Notification }         from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';
import { NotificationDevice }   from './entities/notification-device.entity';

import { FcmProvider }              from './providers/fcm.provider';
import { SesProvider }              from './providers/ses.provider';
import { SnsProvider }              from './providers/sns.provider';
import { NotificationService }      from './notification.service';
import { NotificationController }   from './notification.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationTemplate,
      NotificationDelivery,
      NotificationDevice,
    ]),
    ConfigModule,
    HttpModule, // For calling Identity Service (email/supervisor lookups)
  ],
  controllers: [NotificationController],
  providers:   [
    FcmProvider,
    SesProvider,
    SnsProvider,
    NotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
