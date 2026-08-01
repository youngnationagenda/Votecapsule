// ============================================================
// VoteCapsule — LicenseController
// REST endpoints for license key management
// ============================================================
import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { LicenseService } from '../license.service';
import { CreateLicenseDto } from '../dto';

@Controller('licenses')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'billing', timestamp: new Date().toISOString() };
  }

  /** POST /licenses — create a new license */
  @Post()
  create(@Body() dto: CreateLicenseDto) {
    return this.licenseService.create(dto);
  }

  /** GET /licenses/tenant/:tenantId — all licenses for a tenant */
  @Get('tenant/:tenantId')
  findByTenant(@Param('tenantId') tenantId: string) {
    return this.licenseService.findByTenant(tenantId);
  }

  /** GET /licenses/validate/:key — validate a license key */
  @Get('validate/:key')
  validate(@Param('key') key: string) {
    return this.licenseService.validate(key);
  }

  /** POST /licenses/:id/deactivate — deactivate a license */
  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.licenseService.deactivate(id);
  }
}
