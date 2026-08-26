/**
 * Vote Capsule™ Tenant Service — Tenants Controller
 *
 * POST   /tenants
 * GET    /tenants
 * GET    /tenants/:id
 * PATCH  /tenants/:id
 * DELETE /tenants/:id
 * GET    /tenants/:id/settings
 * PATCH  /tenants/:id/settings
 *
 * Party KYC endpoints (Tasks 3 & 4):
 * GET    /tenants/:id/kyc
 * PATCH  /tenants/:id/kyc
 * GET    /tenants/:id/officials
 * POST   /tenants/:id/officials
 * PATCH  /tenants/:id/officials/:officialIdx
 * DELETE /tenants/:id/officials/:officialIdx
 * PATCH  /tenants/:id/branding
 * PATCH  /tenants/:id/social-media
 * POST   /tenants/:id/upload
 *
 * Nomination limits (Task 8):
 * GET    /tenants/:id/nomination-limits
 * PATCH  /tenants/:id/nomination-limits
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  ParseUUIDPipe,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { GatewayAuthGuard } from '../common/guards/gateway-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SystemRole, PaginationQuery, JwtPayload } from '@vote-capsule/types';

const PARTY_ASSETS_BUCKET = process.env['S3_PARTY_ASSETS_BUCKET'] ?? 'vote-capsule-party-assets-683541453923';
const AWS_REGION = process.env['AWS_REGION'] ?? 'us-east-1';

type AuthReq = Request & { user?: JwtPayload };

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(GatewayAuthGuard, RolesGuard)
@ApiBearerAuth('jwt')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // ─────────────────────────────────────────────────────────────
  // Core CRUD
  // ─────────────────────────────────────────────────────────────

  @Post()
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new tenant organization' })
  create(@Body() dto: CreateTenantDto, @Req() req: AuthReq) {
    return this.tenantsService.create(dto, req.user?.sub ?? '');
  }

  @Get()
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'List all tenants (paginated)' })
  findAll(@Query() query: PaginationQuery) {
    return this.tenantsService.findAll(query);
  }

  @Get('stats')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN)
  @ApiOperation({ summary: 'Get tenant count statistics by type' })
  getStats() {
    return this.tenantsService.getTenantStats();
  }

  @Get(':id')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN, SystemRole.SUPPORT_ADMIN, SystemRole.PARTY_ADMIN)
  @ApiOperation({ summary: 'Get tenant by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findById(id);
  }

  @Patch(':id')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update tenant details' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a tenant (PLATFORM_SUPER_ADMIN only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.tenantsService.softDelete(id);
  }

  @Get(':id/settings')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get tenant settings' })
  getSettings(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.getSettings(id);
  }

  @Patch(':id/settings')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN, SystemRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update tenant settings' })
  async updateSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() settings: Record<string, unknown>,
    @Req() req: AuthReq,
  ): Promise<void> {
    await this.tenantsService.updateSettings(id, settings, req.user?.sub ?? '');
  }

  // ─────────────────────────────────────────────────────────────
  // Party KYC endpoints (Task 3)
  // ─────────────────────────────────────────────────────────────

  @Get(':id/kyc')
  @Roles(SystemRole.PARTY_ADMIN, SystemRole.PLATFORM_SUPER_ADMIN)
  @ApiOperation({ summary: 'Get party KYC data' })
  async getKyc(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthReq) {
    this.validateTenantAccess(req, id);
    const tenant = await this.tenantsService.findById(id);
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return (tenant.settings as Record<string, unknown>)['kyc'] ?? {};
  }

  @Patch(':id/kyc')
  @Roles(SystemRole.PARTY_ADMIN, SystemRole.PLATFORM_SUPER_ADMIN)
  @ApiOperation({ summary: 'Update party KYC fields (partial merge)' })
  async updateKyc(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: AuthReq,
  ) {
    this.validateTenantAccess(req, id);
    return this.tenantsService.updateSettingsJsonbKey(id, 'kyc', body);
  }

  // ─────────────────────────────────────────────────────────────
  // Party Officials CRUD (Task 3)
  // ─────────────────────────────────────────────────────────────

  @Get(':id/officials')
  @Roles(SystemRole.PARTY_ADMIN, SystemRole.PLATFORM_SUPER_ADMIN)
  @ApiOperation({ summary: 'Get party officials list' })
  async getOfficials(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthReq) {
    this.validateTenantAccess(req, id);
    const tenant = await this.tenantsService.findById(id);
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return (tenant.settings as Record<string, unknown>)['officials'] ?? [];
  }

  @Post(':id/officials')
  @Roles(SystemRole.PARTY_ADMIN)
  @ApiOperation({ summary: 'Add an official to the party' })
  async addOfficial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: AuthReq,
  ) {
    this.validateTenantAccess(req, id);
    return this.tenantsService.addOfficial(id, body);
  }

  @Patch(':id/officials/:officialIdx')
  @Roles(SystemRole.PARTY_ADMIN)
  @ApiOperation({ summary: 'Update an official by index' })
  async updateOfficial(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('officialIdx') officialIdx: string,
    @Body() body: Record<string, unknown>,
    @Req() req: AuthReq,
  ) {
    this.validateTenantAccess(req, id);
    const idx = parseInt(officialIdx, 10);
    if (isNaN(idx) || idx < 0) throw new BadRequestException('officialIdx must be a non-negative integer');
    return this.tenantsService.updateOfficial(id, idx, body);
  }

  @Delete(':id/officials/:officialIdx')
  @Roles(SystemRole.PARTY_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an official by index' })
  async removeOfficial(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('officialIdx') officialIdx: string,
    @Req() req: AuthReq,
  ): Promise<void> {
    this.validateTenantAccess(req, id);
    const idx = parseInt(officialIdx, 10);
    if (isNaN(idx) || idx < 0) throw new BadRequestException('officialIdx must be a non-negative integer');
    await this.tenantsService.removeOfficial(id, idx);
  }

  // ─────────────────────────────────────────────────────────────
  // Branding & Social Media (Task 3)
  // ─────────────────────────────────────────────────────────────

  @Patch(':id/branding')
  @Roles(SystemRole.PARTY_ADMIN, SystemRole.PLATFORM_SUPER_ADMIN)
  @ApiOperation({ summary: 'Update party branding (primary_color, logo_url, banner_url, etc.)' })
  async updateBranding(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: AuthReq,
  ) {
    this.validateTenantAccess(req, id);
    return this.tenantsService.updateSettingsJsonbKey(id, 'branding', body);
  }

  @Patch(':id/social-media')
  @Roles(SystemRole.PARTY_ADMIN)
  @ApiOperation({ summary: 'Update party social media handles' })
  async updateSocialMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: AuthReq,
  ) {
    this.validateTenantAccess(req, id);
    return this.tenantsService.updateSettingsJsonbKey(id, 'social_media', body);
  }

  // ─────────────────────────────────────────────────────────────
  // S3 Asset Upload (Task 4)
  // ─────────────────────────────────────────────────────────────

  @Post(':id/upload')
  @Roles(SystemRole.PARTY_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: ['logo', 'banner'] },
      },
    },
  })
  @ApiOperation({ summary: 'Upload party logo or banner to S3' })
  async uploadAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Req() req: AuthReq,
  ) {
    this.validateTenantAccess(req, id);

    if (!file) throw new BadRequestException('No file provided');
    if (type !== 'logo' && type !== 'banner') {
      throw new BadRequestException('type must be "logo" or "banner"');
    }

    // Validate file type and size
    if (type === 'logo') {
      if (!['image/png', 'image/svg+xml'].includes(file.mimetype)) {
        throw new BadRequestException('Logo must be PNG or SVG');
      }
      if (file.size > 2 * 1024 * 1024) {
        throw new BadRequestException('Logo must be under 2MB');
      }
    } else {
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.mimetype)) {
        throw new BadRequestException('Banner must be PNG or JPG/JPEG');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('Banner must be under 5MB');
      }
    }

    // Sanitize filename
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${id}/${type}/${Date.now()}_${safeName}`;

    // Upload to S3
    const s3 = new S3Client({ region: AWS_REGION });
    await s3.send(new PutObjectCommand({
      Bucket: PARTY_ASSETS_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    const url = `https://${PARTY_ASSETS_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;

    // Auto-update branding in tenant settings
    const brandingField = type === 'logo' ? 'logo_url' : 'banner_url';
    await this.tenantsService.updateSettingsJsonbKey(id, 'branding', { [brandingField]: url });

    // Also update the top-level logo_url column for logo uploads
    if (type === 'logo') {
      await this.tenantsService.updateLogoUrl(id, url);
    }

    return { url, type, key, bucket: PARTY_ASSETS_BUCKET };
  }

  // ─────────────────────────────────────────────────────────────
  // Nomination Limits (Task 8)
  // ─────────────────────────────────────────────────────────────

  @Get(':id/nomination-limits')
  @Roles(SystemRole.PARTY_ADMIN, SystemRole.PLATFORM_SUPER_ADMIN)
  @ApiOperation({ summary: 'Get nomination subscription limits for a tenant' })
  async getNominationLimits(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthReq) {
    this.validateTenantAccess(req, id);
    return this.tenantsService.getNominationLimits(id);
  }

  @Patch(':id/nomination-limits')
  @Roles(SystemRole.PLATFORM_SUPER_ADMIN)
  @ApiOperation({ summary: 'Update nomination limits for a tenant (SUPER ADMIN only)' })
  async updateNominationLimits(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: {
      maxNominations?: number;
      maxCandidatesPerNomination?: number;
      allowedPositions?: string[];
      canRunNominations?: boolean;
    },
  ) {
    return this.tenantsService.updateNominationLimits(id, body);
  }

  // ─────────────────────────────────────────────────────────────
  // Access control helper
  // ─────────────────────────────────────────────────────────────

  /**
   * Validates that the calling user belongs to the target tenant,
   * OR is a PLATFORM_SUPER_ADMIN (who can access any tenant).
   */
  private validateTenantAccess(req: AuthReq, tenantId: string): void {
    const user = req.user;
    if (!user) throw new ForbiddenException('Not authenticated');
    const isSuperAdmin = user.roles?.includes(SystemRole.PLATFORM_SUPER_ADMIN);
    if (isSuperAdmin) return; // super admins bypass tenant isolation
    if (user.tenantId !== tenantId) {
      throw new ForbiddenException('You do not have access to this tenant');
    }
  }
}
