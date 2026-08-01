// ============================================================
// VoteCapsule — PaymentController
// REST endpoints for payments (M-Pesa, card, bank_transfer)
// ============================================================
import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { PaymentService } from '../payment.service';
import { CreatePaymentDto, QueryPaymentsDto } from '../dto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'billing', timestamp: new Date().toISOString() };
  }

  /** POST /payments — initiate a payment */
  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentService.create(dto);
  }

  /** GET /payments?tenantId=&status=&paymentMethod=&dateFrom=&dateTo=&page=&limit= */
  @Get()
  findAll(@Query() query: QueryPaymentsDto) {
    if (!query.tenantId) {
      return { data: [], total: 0, page: 1, limit: 20 };
    }
    return this.paymentService.findByTenant(query.tenantId, query);
  }

  /** GET /payments/:id */
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.paymentService.findById(id);
  }

  /** POST /payments/:id/complete — mark payment completed (provider callback) */
  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @Body() body: { providerResponse: Record<string, unknown> },
  ) {
    return this.paymentService.complete(id, body.providerResponse);
  }

  /** POST /payments/:id/fail — mark payment failed */
  @Post(':id/fail')
  fail(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.paymentService.fail(id, body.reason);
  }

  /** POST /payments/:id/refund — partial or full refund */
  @Post(':id/refund')
  refund(
    @Param('id') id: string,
    @Body() body: { amount: number; reason: string },
  ) {
    return this.paymentService.refund(id, body.amount, body.reason);
  }

  /** POST /payments/reconcile — find payment by provider transaction ID */
  @Post('reconcile')
  reconcile(@Body() body: { providerTransactionId: string }) {
    return this.paymentService.reconcile(body.providerTransactionId);
  }
}
