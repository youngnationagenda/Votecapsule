// ============================================================
// VoteCapsule NEC — Geography Controller
// services/geography/src/geography.controller.ts
// ============================================================
import {
  Controller, Get, Param, Query, HttpCode, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { GeographyService, GeographyStats, CountySummary, ConstituencySummary, WardSummary } from './geography.service';
import { StationType } from './entities/polling-station.entity';

@ApiTags('NEC Geography')
@Controller()
export class GeographyController {
  constructor(private readonly geo: GeographyService) {}

  // ── Stats ────────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide NEC statistics (station counts, voter totals)' })
  getStats(): Promise<GeographyStats> {
    return this.geo.getStats();
  }

  // ── Counties ─────────────────────────────────────────────────────────────

  @Get('counties')
  @ApiOperation({ summary: 'List all 47 counties' })
  @ApiQuery({ name: 'includeSpecial', required: false, type: Boolean })
  getCounties(@Query('includeSpecial') includeSpecial?: string) {
    return this.geo.getCounties(includeSpecial === 'true');
  }

  /**
   * GET /geography/counties/summary
   * All 47 counties with constituency_count, ward_count, polling_station_count,
   * and registered_voters (bottom-up synced from polling stations — migration 172).
   */
  @Get('counties/summary')
  @ApiOperation({ summary: 'All 47 counties with constituency, ward & PS counts + voters' })
  getCountySummary(): Promise<CountySummary[]> {
    return this.geo.getCountyStats();
  }

  @Get('counties/:code')
  @ApiOperation({ summary: 'Get county by IEBC code (e.g. 001)' })
  @ApiParam({ name: 'code', example: '001' })
  getCounty(@Param('code') code: string) {
    return this.geo.getCountyByCode(code);
  }

  @Get('counties/:code/constituencies')
  @ApiOperation({ summary: 'List constituencies in a county' })
  @ApiParam({ name: 'code', example: '001' })
  getConstByCounty(@Param('code') code: string) {
    return this.geo.getConstituencies(code);
  }

  // ── Constituencies ────────────────────────────────────────────────────────

  @Get('constituencies')
  @ApiOperation({ summary: 'List all 290 constituencies' })
  @ApiQuery({ name: 'countyCode', required: false })
  getConstituencies(@Query('countyCode') countyCode?: string) {
    return this.geo.getConstituencies(countyCode);
  }

  /**
   * GET /geography/constituencies/summary
   * All 290 constituencies with ward_count, polling_station_count, registered_voters,
   * and parent county info. Optionally filter by countyCode.
   */
  @Get('constituencies/summary')
  @ApiOperation({ summary: 'All 290 constituencies with ward & PS counts + voters' })
  @ApiQuery({ name: 'countyCode', required: false })
  getConstituencySummary(@Query('countyCode') countyCode?: string): Promise<ConstituencySummary[]> {
    return this.geo.getConstituencySummaries(countyCode);
  }

  @Get('constituencies/:code')
  @ApiOperation({ summary: 'Get constituency by IEBC code (e.g. 001)' })
  @ApiParam({ name: 'code', example: '001' })
  getConstituency(@Param('code') code: string) {
    return this.geo.getConstituencyByCode(code);
  }

  @Get('constituencies/:code/wards')
  @ApiOperation({ summary: 'List wards in a constituency' })
  @ApiParam({ name: 'code', example: '001' })
  getWardsByConst(@Param('code') code: string) {
    return this.geo.getWards(code);
  }

  // ── Wards ─────────────────────────────────────────────────────────────────

  @Get('wards')
  @ApiOperation({ summary: 'List wards — optionally filtered by constituency' })
  @ApiQuery({ name: 'constituencyCode', required: false })
  getWards(@Query('constituencyCode') constituencyCode?: string) {
    return this.geo.getWards(constituencyCode);
  }

  /**
   * GET /geography/wards/summary
   * All 1,447 wards with polling_station_count, registration_centre_count,
   * registered_voters, and parent constituency+county. Filter by
   * constituencyCode or countyCode.
   */
  @Get('wards/summary')
  @ApiOperation({ summary: 'All wards with PS & RC counts + voters, with parent info' })
  @ApiQuery({ name: 'constituencyCode', required: false })
  @ApiQuery({ name: 'countyCode', required: false })
  getWardSummary(
    @Query('constituencyCode') constituencyCode?: string,
    @Query('countyCode')       countyCode?: string,
  ): Promise<WardSummary[]> {
    return this.geo.getWardSummaries(constituencyCode, countyCode);
  }

  @Get('wards/:code')
  @ApiOperation({ summary: 'Get ward by IEBC code (e.g. 0001)' })
  @ApiParam({ name: 'code', example: '0001' })
  getWard(@Param('code') code: string) {
    return this.geo.getWardByCode(code);
  }

  @Get('wards/:code/centres')
  @ApiOperation({ summary: 'List registration centres in a ward' })
  @ApiParam({ name: 'code', example: '0001' })
  getCentresByWard(@Param('code') code: string) {
    return this.geo.getRegistrationCentres(code);
  }

  // ── Registration Centres ──────────────────────────────────────────────────

  @Get('centres')
  @ApiOperation({ summary: 'List registration centres — optionally filtered by ward' })
  @ApiQuery({ name: 'wardCode', required: false })
  getCentres(@Query('wardCode') wardCode?: string) {
    return this.geo.getRegistrationCentres(wardCode);
  }

  @Get('centres/:code')
  @ApiOperation({ summary: 'Get registration centre by 13-digit IEBC code' })
  getCentre(@Param('code') code: string) {
    return this.geo.getCentreByCode(code);
  }

  // ── Polling Stations ──────────────────────────────────────────────────────

  @Get('polling-stations')
  @ApiOperation({ summary: 'List polling stations with optional filters' })
  @ApiQuery({ name: 'countyCode',       required: false })
  @ApiQuery({ name: 'constituencyCode', required: false })
  @ApiQuery({ name: 'wardCode',         required: false })
  @ApiQuery({ name: 'centreCode',       required: false })
  @ApiQuery({ name: 'stationType',      required: false, enum: StationType })
  @ApiQuery({ name: 'activeOnly',       required: false, type: Boolean })
  getPollingStations(
    @Query('countyCode')       countyCode?:       string,
    @Query('constituencyCode') constituencyCode?: string,
    @Query('wardCode')         wardCode?:         string,
    @Query('centreCode')       centreCode?:       string,
    @Query('stationType')      stationType?:      StationType,
    @Query('activeOnly')       activeOnly?:       string,
  ) {
    return this.geo.getPollingStations({
      countyCode,
      constituencyCode,
      wardCode,
      centreCode,
      stationType,
      activeOnly: activeOnly !== 'false',
    });
  }

  @Get('polling-stations/search')
  @ApiOperation({ summary: 'Search polling stations by name' })
  @ApiQuery({ name: 'q',     required: true,  description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default 20)' })
  searchStations(
    @Query('q')     query: string,
    @Query('limit') limit?: string,
  ) {
    return this.geo.searchStations(query, limit ? parseInt(limit, 10) : 20);
  }

  /**
   * Core validation endpoint — used by Evidence Capsule Service and AI Engine.
   * Returns full station context or 404 if code is invalid.
   */
  @Get('polling-stations/:code/validate')
  @ApiOperation({
    summary: 'Validate a polling station code and return full context',
    description:
      'Used by the Evidence Capsule Service to verify station before accepting a submission. ' +
      'Returns county, constituency, ward, centre, stream, voter count, and GPS if available.',
  })
  @ApiParam({ name: 'code', example: '001001000100101', description: '15-digit IEBC station code' })
  validateStation(@Param('code') code: string) {
    return this.geo.validateStation(code);
  }

  @Get('polling-stations/:code')
  @ApiOperation({ summary: 'Get polling station by 15-digit IEBC code' })
  @ApiParam({ name: 'code', example: '001001000100101' })
  getStation(@Param('code') code: string) {
    return this.geo.getPollingStationByCode(code);
  }

  // ── Voter Registration Area Lookup ──────────────────────────────────────────

  /**
   * GET /geography/voters/lookup
   * Voter registration area lookup.
   * Given a county (+ optionally constituency and ward), returns the polling
   * stations in that area so a voter can find their assigned station.
   *
   * Does NOT expose individual voter data — only aggregate station info.
   * Query params:
   *   countyCode (required)
   *   constituencyCode (optional)
   *   wardCode (optional)
   */
  @Get('voters/lookup')
  @ApiOperation({
    summary: 'Voter registration area lookup — returns polling stations for the given area',
    description:
      'Voter finds their station based on registration area (county/constituency/ward) ' +
      'as shown on their voter card. No individual voter data is exposed.',
  })
  @ApiQuery({ name: 'countyCode',       required: true,  description: '3-digit IEBC county code' })
  @ApiQuery({ name: 'constituencyCode', required: false, description: '3-digit IEBC constituency code' })
  @ApiQuery({ name: 'wardCode',         required: false, description: '4-digit IEBC ward code' })
  async voterLookup(
    @Query('countyCode')       countyCode: string,
    @Query('constituencyCode') constituencyCode?: string,
    @Query('wardCode')         wardCode?: string,
  ) {
    if (!countyCode) {
      throw new BadRequestException('countyCode query parameter is required');
    }
    return this.geo.getVoterLookup(countyCode, constituencyCode, wardCode);
  }

  // ── Registered Voters ─────────────────────────────────────────────────────

  @Get('registered-voters')
  @ApiOperation({ summary: 'Total registered voters across Kenya' })
  async getTotalVoters(): Promise<{ total: number }> {
    const total = await this.geo.getTotalRegisteredVoters();
    return { total };
  }

  @Get('registered-voters/by-county')
  @ApiOperation({ summary: 'Registered voters grouped by county' })
  getVotersByCounty() {
    return this.geo.getRegisteredVotersByCounty();
  }
}
