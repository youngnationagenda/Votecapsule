// ============================================================
// VoteCapsule — InvoiceService
// Creates, issues, and manages invoices
// ============================================================
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Invoice, InvoiceItem } from './entities';
import { CreateInvoiceDto, QueryInvoicesDto } from './dto';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly itemRepo: Repository<InvoiceItem>,
  ) {}

  /** Create an invoice with line items */
  async create(dto: CreateInvoiceDto): Promise<Invoice> {
    const invoiceNumber = await this.generateInvoiceNumber();

    // Calculate totals from items
    const items = dto.items.map((item) => {
      const amount = item.quantity * item.unitPrice;
      return this.itemRepo.create({
        description: item.description,
        itemType: item.itemType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount,
        planId: item.planId ?? null,
        licenseId: item.licenseId ?? null,
      });
    });

    const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
    const taxRate = 0.16; // Kenya VAT 16%
    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + taxAmount;

    // Due in 30 days
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = this.invoiceRepo.create({
      tenantId: dto.tenantId,
      subscriptionId: dto.subscriptionId ?? null,
      invoiceNumber,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      dueDate,
      currency: 'KES',
      subtotal,
      taxAmount,
      taxRate,
      total,
      amountDue: total,
      status: 'draft',
      items,
    });

    return this.invoiceRepo.save(invoice);
  }

  /** Find all invoices (admin view — no tenant filter) */
  async findAll(
    query: QueryInvoicesDto,
  ): Promise<{ data: Invoice[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const qb = this.invoiceRepo.createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items');

    if (query.status) {
      qb.andWhere('invoice.status = :status', { status: query.status });
    }
    if (query.dateFrom) {
      qb.andWhere('invoice.created_at >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('invoice.created_at <= :dateTo', { dateTo: query.dateTo });
    }

    qb.orderBy('invoice.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /** Paginated invoice query for a tenant */
  async findByTenant(
    tenantId: string,
    query: QueryInvoicesDto,
  ): Promise<{ data: Invoice[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.invoiceRepo.createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .where('invoice.tenant_id = :tenantId', { tenantId });

    if (query.status) {
      qb.andWhere('invoice.status = :status', { status: query.status });
    }
    if (query.dateFrom) {
      qb.andWhere('invoice.created_at >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('invoice.created_at <= :dateTo', { dateTo: query.dateTo });
    }

    qb.orderBy('invoice.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /** Find a single invoice by ID with items */
  async findById(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  /** Mark an invoice as issued */
  async issue(id: string): Promise<Invoice> {
    const invoice = await this.findById(id);
    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be issued');
    }

    invoice.status = 'issued';
    invoice.issuedAt = new Date();
    invoice.version += 1;
    return this.invoiceRepo.save(invoice);
  }

  /** Mark an invoice as paid */
  async markPaid(id: string, paymentId: string): Promise<Invoice> {
    const invoice = await this.findById(id);
    if (invoice.status === 'void') {
      throw new BadRequestException('Cannot pay a voided invoice');
    }

    invoice.status = 'paid';
    invoice.amountPaid = Number(invoice.total);
    invoice.amountDue = 0;
    invoice.paidAt = new Date();
    invoice.metadata = { ...invoice.metadata, paymentId };
    invoice.version += 1;
    return this.invoiceRepo.save(invoice);
  }

  /** Void an invoice */
  async void(id: string): Promise<Invoice> {
    const invoice = await this.findById(id);
    if (invoice.status === 'paid') {
      throw new BadRequestException('Cannot void a paid invoice — use refund instead');
    }

    invoice.status = 'void';
    invoice.voidedAt = new Date();
    invoice.amountDue = 0;
    invoice.version += 1;
    return this.invoiceRepo.save(invoice);
  }

  /** Get all overdue invoices for collection workflows */
  async getOverdueInvoices(): Promise<Invoice[]> {
    const now = new Date();
    return this.invoiceRepo.find({
      where: {
        status: In(['issued', 'partial']),
        dueDate: LessThan(now),
      },
      order: { dueDate: 'ASC' },
    });
  }

  /** Generate sequential invoice number: VC-YYYY-NNNNNN */
  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `VC-${year}-`;

    const lastInvoice = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .where('invoice.invoice_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('invoice.invoice_number', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastInvoice) {
      const lastNum = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''), 10);
      sequence = lastNum + 1;
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
