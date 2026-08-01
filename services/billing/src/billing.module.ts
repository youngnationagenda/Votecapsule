// ============================================================
// VoteCapsule — BillingModule
// Aggregates all billing domain services and controllers
// ============================================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  PricingPlan,
  Subscription,
  License,
  Invoice,
  InvoiceItem,
  Payment,
  PaymentMethod,
  UsageRecord,
} from './entities';

import { PlanService } from './plan.service';
import { SubscriptionService } from './subscription.service';
import { InvoiceService } from './invoice.service';
import { PaymentService } from './payment.service';
import { LicenseService } from './license.service';

import {
  PlanController,
  SubscriptionController,
  InvoiceController,
  PaymentController,
  LicenseController,
} from './controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PricingPlan,
      Subscription,
      License,
      Invoice,
      InvoiceItem,
      Payment,
      PaymentMethod,
      UsageRecord,
    ]),
  ],
  controllers: [
    PlanController,
    SubscriptionController,
    InvoiceController,
    PaymentController,
    LicenseController,
  ],
  providers: [
    PlanService,
    SubscriptionService,
    InvoiceService,
    PaymentService,
    LicenseService,
  ],
  exports: [
    PlanService,
    SubscriptionService,
    InvoiceService,
    PaymentService,
    LicenseService,
  ],
})
export class BillingModule {}
