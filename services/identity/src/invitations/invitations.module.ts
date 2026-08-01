import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { UsersModule } from '../users/users.module';
import { SubscriptionGuard } from '../common/subscription.guard';

@Module({
  imports: [
    UsersModule,
    HttpModule, // For calling Notification Service + Billing Service
  ],
  controllers: [InvitationsController],
  providers: [
    InvitationsService,
    SubscriptionGuard, // Subscription check on invite creation
  ],
  exports: [InvitationsService, SubscriptionGuard],
})
export class InvitationsModule {}
