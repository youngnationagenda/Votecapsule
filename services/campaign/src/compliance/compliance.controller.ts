// ============================================================
// VoteCapsule™ — Campaign Compliance Controller
// Endpoints for IEBC Campaign Financing compliance tracking
// ============================================================
import {
  Controller, Get, Post, Delete, Patch, Param, Body, Headers,
  HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
  UseInterceptors, UploadedFile, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ComplianceService }         from './compliance.service';
import { ComplianceDocumentService } from './compliance-document.service';

@Controller('campaigns/:campaignId/compliance')
export class ComplianceController {
  constructor(
    private readonly service:     ComplianceService,
    private readonly docService:  ComplianceDocumentService,
  ) {}

  // ── GET /campaigns/:id/compliance ────────────────────────────
  // Returns computed compliance score + checklist

  @Get()
  getStatus(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Headers('x-tenant-id') tid: string,
  ) {
    if (!tid) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getStatus(cid, tid);
  }

  // ── Authorized Persons (Form ECF 1) ──────────────────────────

  @Get('authorized-persons')
  listPersons(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Headers('x-tenant-id') tid: string,
  ) {
    if (!tid) throw new BadRequestException('X-Tenant-Id required');
    return this.service.listPersons(cid, tid);
  }

  @Post('authorized-persons')
  @HttpCode(HttpStatus.CREATED)
  registerPerson(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Body() dto: any,
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
  ) {
    if (!tid || !uid) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    if (!dto.fullName && !dto.full_name) throw new BadRequestException('fullName is required');
    if (!dto.idNumber && !dto.id_number) throw new BadRequestException('idNumber is required');
    // Normalise camelCase → entity field names
    const normalised = {
      fullName:          dto.fullName || dto.full_name,
      idNumber:          dto.idNumber || dto.id_number,
      pinNumber:         dto.pinNumber || dto.pin || dto.pin_number || null,
      email:             dto.email || null,
      phone:             dto.phone || null,
      gender:            dto.gender || null,
      postalAddress:     dto.postalAddress || dto.postal_address || null,
      role:              dto.role || 'agent',
      committeePosition: dto.committeePosition || dto.committee_position || null,
      dateAppointed:     dto.dateAppointed || dto.date_appointed || null,
      notes:             dto.notes || null,
    };
    return this.service.registerPerson(cid, tid, uid, normalised);
  }

  @Delete('authorized-persons/:personId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePerson(
    @Param('campaignId', ParseUUIDPipe)  cid: string,
    @Param('personId', ParseUUIDPipe)   pid: string,
    @Headers('x-tenant-id') tid: string,
  ) {
    if (!tid) throw new BadRequestException('X-Tenant-Id required');
    await this.service.removePerson(pid, cid, tid);
  }

  // ── Bank Account (Reg. 11) ────────────────────────────────────

  @Get('bank-account')
  getBankAccount(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Headers('x-tenant-id') tid: string,
  ) {
    if (!tid) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getBankAccount(cid, tid);
  }

  @Post('bank-account')
  @HttpCode(HttpStatus.CREATED)
  registerBankAccount(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Body() dto: any,
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
  ) {
    if (!tid || !uid) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    if (!dto.bankName && !dto.bank_name) throw new BadRequestException('bankName is required');
    const normalised = {
      bankName:      dto.bankName || dto.bank_name,
      branchName:    dto.branchName || dto.branch_name || null,
      accountNumber: dto.accountNumber || dto.account_number,
      currency:      dto.currency || 'KES',
      signatories:   Array.isArray(dto.signatories) ? dto.signatories : [],
    };
    return this.service.registerBankAccount(cid, tid, uid, normalised);
  }

  // ── Supporting Organizations (Form ECF 3) ────────────────────

  @Get('supporting-orgs')
  listSupportingOrgs(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Headers('x-tenant-id') tid: string,
  ) {
    if (!tid) throw new BadRequestException('X-Tenant-Id required');
    return this.service.listSupportingOrgs(cid, tid);
  }

  @Post('supporting-orgs')
  @HttpCode(HttpStatus.CREATED)
  registerSupportingOrg(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Body() dto: any,
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
  ) {
    if (!tid || !uid) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    if (!dto.name && !dto.org_name) throw new BadRequestException('name is required');
    const normalised = {
      orgName:          dto.name || dto.orgName || dto.org_name,
      contactPerson:    dto.responsiblePerson || dto.contactPerson || dto.contact_person || null,
      email:            dto.email || null,
      phone:            dto.phone || null,
      postalAddress:    dto.address || dto.postalAddress || null,
      consentLetterRef: dto.consentLetter || dto.consentLetterRef || null,
    };
    return this.service.registerSupportingOrg(cid, tid, uid, normalised);
  }

  // ── Reports (Form ECF 6, 7, 8) ───────────────────────────────

  @Get('reports')
  listReports(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Headers('x-tenant-id') tid: string,
  ) {
    if (!tid) throw new BadRequestException('X-Tenant-Id required');
    return this.service.listReports(cid, tid);
  }

  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  submitReport(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Body() dto: any,
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
  ) {
    if (!tid || !uid) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    if (!dto.type) throw new BadRequestException('report type is required (preliminary|final|surplus|auditor)');
    return this.service.submitReport(cid, tid, uid, dto);
  }

  // ── Certificate (Form ECF 8) ──────────────────────────────────

  @Get('certificate')
  getCertificate(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Headers('x-tenant-id') tid: string,
  ) {
    if (!tid) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getCertificate(cid, tid);
  }

  // ── Candidate Monitoring (party-level) ───────────────────────

  @Get('candidates')
  getCandidateCompliance(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Headers('x-tenant-id') tid: string,
  ) {
    if (!tid) throw new BadRequestException('X-Tenant-Id required');
    return this.service.getCandidateCompliance(cid, tid);
  }

  // ── Compliance Documents (Priority 11 — S1/S2) ───────────────

  /**
   * GET /campaigns/:id/compliance/documents
   * List all uploaded compliance documents with signed GET URLs.
   */
  @Get('documents')
  listDocuments(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Headers('x-tenant-id') tid: string,
  ) {
    if (!tid) throw new BadRequestException('X-Tenant-Id required');
    return this.docService.listDocuments(cid, tid).then((data) => ({ data }));
  }

  /**
   * POST /campaigns/:id/compliance/documents
   * Upload a compliance document (multipart/form-data).
   * Fields: file (required), docCode (required).
   */
  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Body() body: any,
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @UploadedFile()         file: any,
  ) {
    if (!tid || !uid) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    if (!file)       throw new BadRequestException('file is required');

    const docCode = body.docCode || body.doc_code;
    if (!docCode)    throw new BadRequestException('docCode is required');

    const result = await this.docService.uploadDocument(
      cid, tid, uid,
      docCode,
      file.originalname,
      file.mimetype,
      file.buffer,
    );
    return { data: result };
  }

  /**
   * GET /campaigns/:id/compliance/documents/:docCode/url
   * Get a signed download URL for a specific compliance document.
   */
  @Get('documents/:docCode/url')
  async getDocumentUrl(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Param('docCode')                   docCode: string,
    @Headers('x-tenant-id')             tid: string,
  ) {
    if (!tid) throw new BadRequestException('X-Tenant-Id required');
    const result = await this.docService.getDocumentUrl(cid, tid, docCode);
    return { data: result };
  }

  /**
   * DELETE /campaigns/:id/compliance/documents/:docCode
   * Delete a compliance document.
   */
  @Delete('documents/:docCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Param('docCode')                   docCode: string,
    @Headers('x-tenant-id')             tid: string,
  ) {
    if (!tid) throw new BadRequestException('X-Tenant-Id required');
    await this.docService.deleteDocument(cid, tid, docCode);
  }

  /**
   * PATCH /campaigns/:id/compliance/documents/:docCode/review
   * Authority/admin endpoint — verify or reject a compliance document.
   * Body: { status: 'verified' | 'rejected', notes?: string }
   * Updates compliance score (verified docs count fully; rejected reset to pending).
   */
  @Patch('documents/:docCode/review')
  async reviewDocument(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Param('docCode')                   docCode: string,
    @Body()                             dto: any,
    @Headers('x-tenant-id')             tid: string,
    @Headers('x-user-id')               uid: string,
  ) {
    if (!tid) throw new BadRequestException('X-Tenant-Id required');
    if (!dto.status || !['verified', 'rejected', 'pending'].includes(dto.status)) {
      throw new BadRequestException('status must be: verified | rejected | pending');
    }
    const result = await this.docService.reviewDocument(cid, tid, docCode, dto.status, dto.notes ?? null, uid);
    return { data: result };
  }

  /**
   * GET /compliance/documents/pending
   * Tenant-level: list all pending compliance documents across ALL campaigns.
   * Used by Authority portal reviewer page.
   * Query: status (default: 'pending'), page, limit
   */
  @Get('documents/pending')
  async listPendingDocuments(
    @Param('campaignId', ParseUUIDPipe) cid: string,
    @Headers('x-tenant-id')             tid: string,
    @Query('status')                    status?: string,
    @Query('page')                      page?: string,
    @Query('limit')                     limit?: string,
  ) {
    if (!tid) throw new BadRequestException('X-Tenant-Id required');
    const result = await this.docService.listAllDocumentsForTenant(
      tid,
      status ?? 'pending',
      parseInt(page ?? '1', 10),
      parseInt(limit ?? '50', 10),
    );
    return result;
  }
}
