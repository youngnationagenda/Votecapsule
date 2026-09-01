// ============================================================
// VoteCapsule™ — Campaign Compliance Controller
// Endpoints for IEBC Campaign Financing compliance tracking
// ============================================================
import {
  Controller, Get, Post, Delete, Param, Body, Headers,
  HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { ComplianceService } from './compliance.service';

@Controller('campaigns/:campaignId/compliance')
export class ComplianceController {
  constructor(private readonly service: ComplianceService) {}

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
}
