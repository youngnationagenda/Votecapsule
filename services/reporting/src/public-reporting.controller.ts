// ============================================================
// VoteCapsule™ — Public Reporting Controller
// services/reporting/src/public-reporting.controller.ts
//
// Unauthenticated endpoints consumed by the Public Transparency Portal.
// Base path: /api/v1/reporting/public  (no 'reports' prefix)
//
// GET /reporting/public/results   — published election results
// GET /reporting/public/progress  — nation-wide reporting progress
// ============================================================
import {
  Controller, Get, Query, BadRequestException,
} from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ScopeLevel }       from './entities/result-snapshot.entity';

@Controller('public')
export class PublicReportingController {
  constructor(private readonly service: ReportingService) {}

  /**
   * GET /reporting/public/results
   * Returns PUBLISHED result snapshots for the given election + position.
   * No authentication required.
   *
   * Query params:
   *   electionYear  {number} required  e.g. 2027
   *   positionCode  {string} required  e.g. PRESIDENT
   *   scopeLevel    {string} optional  NATIONAL | COUNTY | CONSTITUENCY | WARD
   *   countyCode    {string} optional  3-digit county code
   */
  @Get('results')
  async getPublicResults(
    @Query('electionYear') electionYear: string,
    @Query('positionCode') positionCode: string,
    @Query('scopeLevel')   scopeLevel?:  string,
    @Query('countyCode')   countyCode?:  string,
  ) {
    if (!electionYear) throw new BadRequestException('electionYear is required');
    if (!positionCode) throw new BadRequestException('positionCode is required');

    return this.service.getPublicResults({
      electionYear: parseInt(electionYear, 10),
      positionCode,
      scopeLevel:   scopeLevel as ScopeLevel | undefined,
      countyCode,
    });
  }

  /**
   * GET /reporting/public/progress
   * Returns nation-wide reporting progress for the most recent published election.
   * No authentication required.
   *
   * Query params (all optional):
   *   electionYear  {number}  defaults to most recent published
   *   positionCode  {string}  defaults to PRESIDENT
   */
  @Get('progress')
  async getPublicProgress(
    @Query('electionYear') electionYear?: string,
    @Query('positionCode') positionCode?: string,
  ) {
    return this.service.getPublicProgress({
      electionYear: electionYear ? parseInt(electionYear, 10) : undefined,
      positionCode,
    });
  }

  /**
   * GET /reporting/public/elections
   * Returns a list of published elections.
   * No authentication required.
   */
  @Get('elections')
  async getPublicElections() {
    return this.service.getPublicProgress(); // returns national summary; portal uses for election list
  }
}
