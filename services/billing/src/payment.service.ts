// ============================================================
// VoteCapsule — PaymentService
// Records and manages payment transactions (M-Pesa, card, bank)
// ============================================================
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities';
import { InvoiceService } from './invoice.service';
import { CreatePaymentDto, QueryPaymentsDto } from './dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly invoiceService: InvoiceService,
  ) {}

  /** Record a new payment */
  async create(dto: CreatePaymentDto): Promise<Payment> {
    const payment = this.paymentRepo.create({
      tenantId: dto.tenantId,
      invoiceId: dto.invoiceId ?? null,
      amount: dto.amount,
      currency: 'KES',
      paymentMethod: dto.paymentMethod,
      paymentProvider: dto.paymentProvider ?? this.inferProvider(dto.paymentMethod),
      providerTransactionId: dto.providerTransactionId ?? null,
      status: 'pending',
      initiatedAt: new Date(),
    });

    return this.paymentRepo.save(payment);
  }

  /** Paginated payment query */
  async findByTenant(
    tenantId: string,
    query: QueryPaymentsDto,
  ): Promise<{ data: Payment[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.paymentRepo.createQueryBuilder('payment')
      .where('payment.tenant_id = :tenantId', { tenantId });

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }
    if (query.paymentMethod) {
      qb.andWhere('payment.payment_method = :method', { method: query.paymentMethod });
    }
    if (query.dateFrom) {
      qb.andWhere('payment.created_at >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('payment.created_at <= :dateTo', { dateTo: query.dateTo });
    }

    qb.orderBy('payment.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /** Find a payment by ID */
  async findById(id: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);
    return payment;
  }

  /** Mark payment as completed (called after provider confirmation) */
  async complete(id: string, providerResponse: Record<string, unknown>): Promise<Payment> {
    const payment = await this.findById(id);
    if (payment.status !== 'pending' && payment.status !== 'processing') {
      throw new BadRequestException('Payment cannot be completed from current status');
    }

    payment.status = 'completed';
    payment.completedAt = new Date();
    payment.providerResponse = providerResponse;

    const saved = await this.paymentRepo.save(payment);

    // Update associated invoice if present
    if (payment.invoiceId) {
      await this.invoiceService.markPaid(payment.invoiceId, payment.id);
    }

    return saved;
  }

  /** Mark payment as failed */
  async fail(id: string, reason: string): Promise<Payment> {
    const payment = await this.findById(id);
    if (payment.status !== 'pending' && payment.status !== 'processing') {
      throw new BadRequestException('Payment cannot be failed from current status');
    }

    payment.status = 'failed';
    payment.failedAt = new Date();
    payment.failureReason = reason;
    return this.paymentRepo.save(payment);
  }

  /** Refund a payment (partial or full) */
  async refund(id: string, amount: number, reason: string): Promise<Payment> {
    const payment = await this.findById(id);
    if (payment.status !== 'completed') {
      throw new BadRequestException('Can only refund completed payments');
    }

    const totalRefundable = Number(payment.amount) - Number(payment.refundedAmount);
    if (amount > totalRefundable) {
      throw new BadRequestException(
        `Refund amount ${amount} exceeds refundable balance ${totalRefundable}`,
      );
    }

    payment.refundedAmount = Number(payment.refundedAmount) + amount;
    payment.refundedAt = new Date();
    payment.refundReason = reason;

    if (payment.refundedAmount >= Number(payment.amount)) {
      payment.status = 'refunded';
    }

    return this.paymentRepo.save(payment);
  }

  /** Find payment by provider transaction ID (for webhook reconciliation) */
  async reconcile(providerTransactionId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { providerTransactionId },
    });
    if (!payment) {
      throw new NotFoundException(
        `Payment with provider transaction '${providerTransactionId}' not found`,
      );
    }
    return payment;
  }

  // ----- Helpers -----

  private inferProvider(method: string): string {
    switch (method) {
      case 'mpesa': return 'safaricom';
      case 'card': return 'stripe';
      case 'bank_transfer': return 'bank';
      default: return 'manual';
    }
  }
}
