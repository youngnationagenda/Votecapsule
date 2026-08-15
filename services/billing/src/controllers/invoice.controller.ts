// ============================================================
// VoteCapsule — InvoiceController
// REST endpoints for invoices
// ============================================================
import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { InvoiceService } from '../invoice.service';
import { CreateInvoiceDto, QueryInvoicesDto } from '../dto';

@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'billing', timestamp: new Date().toISOString() };
  }

  /** POST /invoices — create invoice with items */
  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoiceService.create(dto);
  }

  /** GET /invoices?tenantId=&status=&dateFrom=&dateTo=&page=&limit= */
  @Get()
  findAll(@Query() query: QueryInvoicesDto) {
    if (!query.tenantId) {
      // Admin view: return all invoices
      return this.invoiceService.findAll(query);
    }
    return this.invoiceService.findByTenant(query.tenantId, query);
  }

  /** GET /invoices/overdue — overdue invoices for collection */
  @Get('overdue')
  getOverdue() {
    return this.invoiceService.getOverdueInvoices();
  }

  /** GET /invoices/:id */
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.invoiceService.findById(id);
  }

  /** POST /invoices/:id/issue — mark as issued */
  @Post(':id/issue')
  issue(@Param('id') id: string) {
    return this.invoiceService.issue(id);
  }

  /** POST /invoices/:id/void — void an invoice */
  @Post(':id/void')
  void(@Param('id') id: string) {
    return this.invoiceService.void(id);
  }
}
