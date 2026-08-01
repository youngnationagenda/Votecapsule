// ============================================================
// VoteCapsule™ — Reporting Service Business Logic
// reporting-service/src/reporting.service.ts
//
// Aggregates election results from evidence_capsules and
// ai_verification_jobs (same Aurora DB — direct SQL reads).
//
// Publication model:
//   DRAFT     → computed, not reviewed
//   VERIFIED  → Election Authority reviewed
//   PUBLISHED → officially released; is_public=TRUE for portals
//
// AI ASSISTS, HUMANS DECIDE.
// Aggregation is automated; publication requires human action.
// ============================================================
import {
  Injectable, Logger, NotFoundException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { ResultSnapshot, ScopeLevel, PublicationStatus } from './entities/result-snapshot.entity';
import { Publication }                                    from './entities/publication.entity';
import { ExportLog, ExportFormat, ExportStatus }         from './entities/export-log.entity';
import { EvidenceCapsuleView }                           from './readers/evidence-capsule.reader';
import { AiJobView }                                     from './readers/ai-job.reader';
import { ComputeSnapshotDto }                            from './dto/compute-snapshot.dto';
import { PublishResultsDto }                             from './dto/publish-results.dto';
import { ExportRequestDto }                              from './dto/export-request.dto';

// Status filter: only capsules that are fully through the pipeline
const REPORTING_STATUSES = ['ANCHORED', 'PUBLISHED'];

interface AggregateRow {
  iebc_station_code:   string;
  county_code:         string;
  county_name:         string;
  constituency_code:   string;
  constituency_name:   string;
  ward_code:           string;
  ward_name:           string;
  polling_station_name: string;
  registered_voters:   string;
  capsule_status:      string;
  ai_confidence_score: string | null;
  ai_flagged:          string;
  votes_cast:          string | null;
  valid_votes:         string | null;
  rejected_votes:      string | null;
}

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    @InjectRepository(ResultSnapshot)
    private readonly snapshotRepo: Repository<ResultSnapshot>,

    @InjectRepository(Publication)
    private readonly publicationRepo: Repository<Publication>,

    @InjectRepository(ExportLog)
    private readonly exportLogRepo: Repository<ExportLog>,

    @InjectDataSource()
    private readonly dataSource: DataSource,

    private readonly config: ConfigService,
  ) {}

  // ══════════════════════════════════════════════════════════
  //  SNAPSHOT COMPUTATION
  // ══════════════════════════════════════════════════════════

  /**
   * Compute (or recompute) result snapshots by reading directly
   * from evidence_capsules and ai_verification_jobs.
   * Runs all scope levels in one pass: NATIONAL + all COUNTY +
   * all CONSTITUENCY + all WARD + all STATION for the given filter.
   *
   * Uses upsert to avoid duplicate-key issues on re-computation.
   */
  async computeSnapshots(
    dto: ComputeSnapshotDto,
    tenantId: string,
    electionId?: string,
  ): Promise<{ computed: number; durationMs: number }> {
    const startMs = Date.now();
    this.logger.log(
      `Computing snapshots: year=${dto.electionYear} position=${dto.positionCode} tenant=${tenantId}`
    );

    // Pull all relevant capsules with their AI job data in one join
    const rows = await this.fetchAggregateRows(tenantId, dto.electionYear, dto.positionCode, dto);

    if (rows.length === 0) {
      this.logger.warn(`No capsules found for year=${dto.electionYear} pos=${dto.positionCode}`);
      return { computed: 0, durationMs: Date.now() - startMs };
    }

    // Group by each geographic level
    const byStation    = this.groupBy(rows, (r) => r.iebc_station_code);
    const byWard       = this.groupBy(rows, (r) => r.ward_code);
    const byConst      = this.groupBy(rows, (r) => r.constituency_code);
    const byCounty     = this.groupBy(rows, (r) => r.county_code);

    const snapshots: Partial<ResultSnapshot>[] = [];

    // ── STATION level ───────────────────────────────────────
    if (!dto.scopeLevel || dto.scopeLevel === ScopeLevel.STATION) {
      for (const [code, stRows] of byStation) {
        const first = stRows[0];
        snapshots.push(this.buildSnapshot({
          tenantId, electionId: electionId ?? null, electionYear: dto.electionYear,
          positionCode: dto.positionCode,
          scopeLevel: ScopeLevel.STATION,
          iebcStationCode: code,
          wardCode:         first.ward_code,
          constituencyCode: first.constituency_code,
          countyCode:       first.county_code,
          scopeName:        first.polling_station_name,
          rows: stRows,
          totalStations: 1,
        }));
      }
    }

    // ── WARD level ──────────────────────────────────────────
    if (!dto.scopeLevel || dto.scopeLevel === ScopeLevel.WARD) {
      for (const [code, wRows] of byWard) {
        const first = wRows[0];
        snapshots.push(this.buildSnapshot({
          tenantId, electionId: electionId ?? null, electionYear: dto.electionYear,
          positionCode: dto.positionCode,
          scopeLevel: ScopeLevel.WARD,
          wardCode:         code,
          constituencyCode: first.constituency_code,
          countyCode:       first.county_code,
          scopeName:        first.ward_name,
          rows: wRows,
          totalStations: new Set(wRows.map((r) => r.iebc_station_code)).size,
        }));
      }
    }

    // ── CONSTITUENCY level ──────────────────────────────────
    if (!dto.scopeLevel || dto.scopeLevel === ScopeLevel.CONSTITUENCY) {
      for (const [code, cRows] of byConst) {
        const first = cRows[0];
        snapshots.push(this.buildSnapshot({
          tenantId, electionId: electionId ?? null, electionYear: dto.electionYear,
          positionCode: dto.positionCode,
          scopeLevel: ScopeLevel.CONSTITUENCY,
          constituencyCode: code,
          countyCode:       first.county_code,
          scopeName:        first.constituency_name,
          rows: cRows,
          totalStations: new Set(cRows.map((r) => r.iebc_station_code)).size,
        }));
      }
    }

    // ── COUNTY level ────────────────────────────────────────
    if (!dto.scopeLevel || dto.scopeLevel === ScopeLevel.COUNTY) {
      for (const [code, countyRows] of byCounty) {
        const first = countyRows[0];
        snapshots.push(this.buildSnapshot({
          tenantId, electionId: electionId ?? null, electionYear: dto.electionYear,
          positionCode: dto.positionCode,
          scopeLevel: ScopeLevel.COUNTY,
          countyCode: code,
          scopeName:  first.county_name,
          rows: countyRows,
          totalStations: new Set(countyRows.map((r) => r.iebc_station_code)).size,
        }));
      }
    }

    // ── NATIONAL level ──────────────────────────────────────
    if (!dto.scopeLevel || dto.scopeLevel === ScopeLevel.NATIONAL) {
      snapshots.push(this.buildSnapshot({
        tenantId, electionId: electionId ?? null, electionYear: dto.electionYear,
        positionCode: dto.positionCode,
        scopeLevel: ScopeLevel.NATIONAL,
        scopeName:  'Kenya',
        rows,
        totalStations: new Set(rows.map((r) => r.iebc_station_code)).size,
      }));
    }

    // Upsert all snapshots using the natural key
    const durationMs = Date.now() - startMs;
    await this.upsertSnapshots(snapshots, durationMs);

    this.logger.log(`Computed ${snapshots.length} snapshots in ${durationMs}ms`);
    return { computed: snapshots.length, durationMs };
  }

  // ══════════════════════════════════════════════════════════
  //  SNAPSHOT RETRIEVAL
  // ══════════════════════════════════════════════════════════

  async getSnapshot(id: string): Promise<ResultSnapshot> {
    const s = await this.snapshotRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException(`Snapshot ${id} not found`);
    return s;
  }

  async listSnapshots(opts: {
    tenantId:          string;
    electionYear?:     number;
    positionCode?:     string;
    scopeLevel?:       ScopeLevel;
    countyCode?:       string;
    constituencyCode?: string;
    publicationStatus?: PublicationStatus;
    publicOnly?:       boolean;
  }): Promise<ResultSnapshot[]> {
    const where: FindOptionsWhere<ResultSnapshot> = { tenantId: opts.tenantId };
    if (opts.electionYear)      where.electionYear      = opts.electionYear;
    if (opts.positionCode)      where.positionCode      = opts.positionCode;
    if (opts.scopeLevel)        where.scopeLevel        = opts.scopeLevel;
    if (opts.countyCode)        where.countyCode        = opts.countyCode;
    if (opts.constituencyCode)  where.constituencyCode  = opts.constituencyCode;
    if (opts.publicationStatus) where.publicationStatus = opts.publicationStatus;
    if (opts.publicOnly)        where.publicationStatus = PublicationStatus.PUBLISHED;

    return this.snapshotRepo.find({
      where,
      order: { scopeLevel: 'ASC', countyCode: 'ASC', completionPercent: 'DESC' },
    });
  }

  // ══════════════════════════════════════════════════════════
  //  DASHBOARD
  // ══════════════════════════════════════════════════════════

  async getDashboard(tenantId: string, electionYear: number): Promise<{
    overview:         Record<string, unknown>;
    byPosition:       ResultSnapshot[];
    coverageByCounty: ResultSnapshot[];
    recentPublications: Publication[];
  }> {
    const [allNational, allCounty, recentPubs] = await Promise.all([
      this.snapshotRepo.find({
        where: { tenantId, electionYear, scopeLevel: ScopeLevel.NATIONAL },
        order: { positionCode: 'ASC' },
      }),
      this.snapshotRepo.find({
        where: { tenantId, electionYear, scopeLevel: ScopeLevel.COUNTY },
        order: { countyCode: 'ASC' },
      }),
      this.publicationRepo.find({
        where: { tenantId, electionYear },
        order: { publishedAt: 'DESC' },
        take: 10,
      }),
    ]);

    const totalStations      = allNational.reduce((s, n) => Math.max(s, n.totalStations), 0);
    const stationsReporting  = allNational.reduce((s, n) => Math.max(s, n.stationsReporting), 0);
    const totalVotesCast     = allNational.reduce((s, n) => s + n.votesCast, 0);
    const avgConfidence      = allNational.reduce((s, n) => s + (n.avgAiConfidence ?? 0), 0) / (allNational.length || 1);

    return {
      overview: {
        electionYear,
        totalStations,
        stationsReporting,
        stationsPending:   totalStations - stationsReporting,
        overallCompletion: totalStations > 0
          ? ((stationsReporting / totalStations) * 100).toFixed(1)
          : '0.0',
        totalVotesCast,
        avgAiConfidence: avgConfidence.toFixed(4),
        positionCount:   allNational.length,
        publishedPositions: allNational.filter(
          (n) => n.publicationStatus === PublicationStatus.PUBLISHED
        ).length,
      },
      byPosition:       allNational,
      coverageByCounty: allCounty,
      recentPublications: recentPubs,
    };
  }

  // ══════════════════════════════════════════════════════════
  //  PUBLIC RESULTS
  // ══════════════════════════════════════════════════════════

  /**
   * Returns PUBLISHED snapshots only — no auth required for this endpoint.
   * Called by the public portal.
   */
  async getPublicResults(opts: {
    electionYear: number;
    positionCode: string;
    scopeLevel?:  ScopeLevel;
    countyCode?:  string;
  }): Promise<ResultSnapshot[]> {
    const where: FindOptionsWhere<ResultSnapshot> = {
      publicationStatus: PublicationStatus.PUBLISHED,
      electionYear:      opts.electionYear,
      positionCode:      opts.positionCode,
    };
    if (opts.scopeLevel) where.scopeLevel = opts.scopeLevel;
    if (opts.countyCode) where.countyCode = opts.countyCode;

    return this.snapshotRepo.find({
      where,
      order: { scopeLevel: 'ASC', completionPercent: 'DESC' },
    });
  }

  // ══════════════════════════════════════════════════════════
  //  PUBLIC PORTAL — REPORTING PROGRESS
  // ══════════════════════════════════════════════════════════

  /**
   * GET /reporting/public/progress
   *
   * Returns nation-wide reporting progress for the most recent active election.
   * No authentication required — called by the Public Transparency Portal.
   *
   * Aggregates PUBLISHED NATIONAL-scope result_snapshots plus a per-county
   * breakdown so the portal can render the progress map.
   *
   * If no published national snapshot exists yet, derives progress from
   * COUNTY-scope snapshots (early reporting state).
   */
  async getPublicProgress(opts: {
    electionYear?: number;
    positionCode?: string;
  } = {}): Promise<{
    electionYear: number;
    positionCode: string;
    totalStations: number;
    stationsReported: number;
    percentReported: number;
    byCounty: Array<{
      countyName:       string;
      countyCode:       string;
      totalStations:    number;
      stationsReported: number;
      percentReported:  number;
    }>;
  }> {
    // Default to the most recently computed national snapshot
    const where: FindOptionsWhere<ResultSnapshot> = {
      publicationStatus: PublicationStatus.PUBLISHED,
      scopeLevel:        ScopeLevel.NATIONAL,
    };
    if (opts.electionYear) where.electionYear = opts.electionYear;
    if (opts.positionCode) where.positionCode = opts.positionCode;

    const national = await this.snapshotRepo.findOne({
      where,
      order: { computedAt: 'DESC' },
    });

    // Fall back to county aggregation if no national snapshot published yet
    const countyWhere: FindOptionsWhere<ResultSnapshot> = {
      publicationStatus: PublicationStatus.PUBLISHED,
      scopeLevel:        ScopeLevel.COUNTY,
    };
    if (opts.electionYear) countyWhere.electionYear = opts.electionYear;
    if (opts.positionCode) countyWhere.positionCode = opts.positionCode;

    const counties = await this.snapshotRepo.find({
      where: countyWhere,
      order: { countyCode: 'ASC' },
      select: ['countyCode', 'scopeName', 'totalStations', 'stationsReporting', 'completionPercent'],
    });

    const totalStations    = national?.totalStations    ?? counties.reduce((s, c) => s + (c.totalStations ?? 0),    0);
    const stationsReported = national?.stationsReporting ?? counties.reduce((s, c) => s + (c.stationsReporting ?? 0), 0);
    const percentReported  = totalStations > 0
      ? Math.round((stationsReported / totalStations) * 10000) / 100
      : 0;

    const electionYear = national?.electionYear ?? opts.electionYear ?? new Date().getFullYear();
    const positionCode = national?.positionCode ?? opts.positionCode ?? 'PRESIDENT';

    const byCounty = counties.map((c) => ({
      countyName:       c.scopeName ?? c.countyCode ?? 'Unknown',
      countyCode:       c.countyCode ?? '',
      totalStations:    c.totalStations    ?? 0,
      stationsReported: c.stationsReporting ?? 0,
      percentReported:  c.totalStations > 0
        ? Math.round(((c.stationsReporting ?? 0) / c.totalStations) * 10000) / 100
        : 0,
    }));

    return { electionYear, positionCode, totalStations, stationsReported, percentReported, byCounty };
  }

  // ══════════════════════════════════════════════════════════
  //  VERIFICATION & PUBLICATION
  // ══════════════════════════════════════════════════════════

  /** Mark a snapshot as VERIFIED by an Election Authority official */
  async verifySnapshot(id: string, verifiedBy: string): Promise<ResultSnapshot> {
    const snapshot = await this.getSnapshot(id);
    if (snapshot.publicationStatus !== PublicationStatus.DRAFT) {
      throw new ConflictException(
        `Snapshot is already ${snapshot.publicationStatus} — only DRAFT snapshots can be verified`
      );
    }
    snapshot.publicationStatus = PublicationStatus.VERIFIED;
    snapshot.verifiedBy        = verifiedBy;
    snapshot.verifiedAt        = new Date();
    return this.snapshotRepo.save(snapshot);
  }

  /**
   * Officially publish results. Creates an immutable Publication record.
   * Only VERIFIED snapshots may be published.
   * AI ASSISTS, HUMANS DECIDE.
   */
  async publishResults(
    dto: PublishResultsDto,
    publishedBy: string,
    publishedByName?: string,
  ): Promise<Publication> {
    const snapshot = await this.getSnapshot(dto.snapshotId);

    if (snapshot.publicationStatus === PublicationStatus.DRAFT) {
      throw new BadRequestException(
        'Snapshot must be VERIFIED before publishing. ' +
        'An Election Authority official must verify results first.'
      );
    }

    // Count prior publications for this snapshot (for version numbering)
    const priorCount = await this.publicationRepo.count({
      where: { snapshotId: dto.snapshotId },
    });

    return this.dataSource.transaction(async (manager) => {
      // Update snapshot to PUBLISHED
      snapshot.publicationStatus = PublicationStatus.PUBLISHED;
      snapshot.publishedBy       = publishedBy;
      snapshot.publishedAt       = new Date();
      await manager.save(ResultSnapshot, snapshot);

      // Create immutable publication record
      const pub = manager.create(Publication, {
        tenantId:           snapshot.tenantId,
        electionYear:       snapshot.electionYear,
        positionCode:       snapshot.positionCode,
        scopeLevel:         snapshot.scopeLevel,
        scopeCode:          snapshot.iebcStationCode
          ?? snapshot.wardCode
          ?? snapshot.constituencyCode
          ?? snapshot.countyCode
          ?? null,
        snapshotId:          snapshot.id,
        stationsReporting:   snapshot.stationsReporting,
        totalStations:       snapshot.totalStations,
        votesCast:           snapshot.votesCast,
        validVotes:          snapshot.validVotes,
        rejectedBallots:     snapshot.rejectedBallots,
        turnoutPercent:      snapshot.turnoutPercent,
        completionPercent:   snapshot.completionPercent,
        publishedBy,
        publishedByName:     publishedByName ?? null,
        gazetteReference:    dto.gazetteReference ?? null,
        notes:               dto.notes ?? null,
        isPublic:            dto.isPublic ?? false,
        publicationVersion:  priorCount + 1,
      });

      const saved = await manager.save(Publication, pub);
      this.logger.log(
        `Results PUBLISHED: ${snapshot.positionCode} ${snapshot.scopeLevel} ` +
        `by ${publishedBy} (v${saved.publicationVersion})`
      );
      return saved;
    });
  }

  // ══════════════════════════════════════════════════════════
  //  ANALYTICS
  // ══════════════════════════════════════════════════════════

  async getAnalytics(tenantId: string, electionYear: number): Promise<{
    coverageTrend:      Record<string, unknown>[];
    flaggedStations:    number;
    lowConfidence:      number;
    anomalyHotspots:    Record<string, unknown>[];
    pendingCounties:    number;
    completedCounties:  number;
  }> {
    // Flagged and low-confidence from evidence_capsules (direct DB read)
    const [flaggedResult, coverageResult, hotspots] = await Promise.all([
      this.dataSource.query(`
        SELECT
          COUNT(*) FILTER (WHERE ai_flagged = true) AS flagged,
          COUNT(*) FILTER (WHERE ai_confidence_score < 0.6 AND ai_confidence_score IS NOT NULL) AS low_confidence
        FROM evidence_capsules
        WHERE tenant_id = $1 AND election_year = $2 AND is_deleted = false
      `, [tenantId, electionYear]),

      this.dataSource.query(`
        SELECT
          county_code,
          county_name,
          COUNT(DISTINCT iebc_station_code) AS total_stations,
          COUNT(DISTINCT CASE WHEN status IN ('ANCHORED','PUBLISHED') THEN iebc_station_code END) AS reporting_stations
        FROM evidence_capsules
        WHERE tenant_id = $1 AND election_year = $2 AND is_deleted = false
        GROUP BY county_code, county_name
        ORDER BY county_code
      `, [tenantId, electionYear]),

      this.dataSource.query(`
        SELECT
          ec.county_code, ec.county_name,
          COUNT(aj.id) AS anomaly_count,
          AVG(ec.ai_confidence_score) AS avg_confidence
        FROM evidence_capsules ec
        JOIN ai_verification_jobs aj ON aj.capsule_id = ec.id
        WHERE ec.tenant_id = $1 AND ec.election_year = $2
          AND ec.ai_flagged = true AND ec.is_deleted = false
        GROUP BY ec.county_code, ec.county_name
        ORDER BY anomaly_count DESC
        LIMIT 10
      `, [tenantId, electionYear]),
    ]);

    const flagRow       = flaggedResult[0] ?? {};
    const completedC    = coverageResult.filter(
      (r: { reporting_stations: string; total_stations: string }) =>
        parseInt(r.reporting_stations, 10) >= parseInt(r.total_stations, 10)
    ).length;

    return {
      coverageTrend:     coverageResult,
      flaggedStations:   parseInt(flagRow.flagged ?? '0', 10),
      lowConfidence:     parseInt(flagRow.low_confidence ?? '0', 10),
      anomalyHotspots:   hotspots,
      pendingCounties:   coverageResult.length - completedC,
      completedCounties: completedC,
    };
  }

  // ══════════════════════════════════════════════════════════
  //  EXPORTS
  // ══════════════════════════════════════════════════════════

  /**
   * Generate CSV result export.
   * Returns raw CSV string; controller streams it to client.
   * PDF and Excel exports are generated asynchronously and stored in S3.
   */
  async exportCsv(
    dto: ExportRequestDto,
    tenantId: string,
    requestedBy: string,
  ): Promise<{ csv: string; logId: string }> {
    const log = await this.exportLogRepo.save(
      this.exportLogRepo.create({
        tenantId,
        requestedBy,
        exportFormat: ExportFormat.CSV,
        scopeLevel:   dto.scopeLevel ?? ScopeLevel.NATIONAL,
        positionCode: dto.positionCode,
        electionYear: dto.electionYear,
        countyCode:   dto.countyCode ?? null,
        constituencyCode: dto.constituencyCode ?? null,
        wardCode:     dto.wardCode ?? null,
        status:       ExportStatus.PENDING,
      })
    );

    try {
      const snapshots = await this.listSnapshots({
        tenantId,
        electionYear:     dto.electionYear,
        positionCode:     dto.positionCode,
        scopeLevel:       dto.scopeLevel,
        countyCode:       dto.countyCode,
        constituencyCode: dto.constituencyCode,
        publicOnly:       dto.publishedOnly ?? false,
      });

      const header = [
        'scope_level', 'scope_name', 'county_code', 'constituency_code',
        'ward_code', 'iebc_station_code',
        'total_stations', 'stations_reporting', 'completion_percent',
        'registered_voters', 'votes_cast', 'valid_votes', 'rejected_ballots',
        'turnout_percent', 'avg_ai_confidence', 'anomaly_count',
        'publication_status', 'published_at',
      ].join(',');

      const rows = snapshots.map((s) => [
        s.scopeLevel,
        `"${(s.scopeName ?? '').replace(/"/g, '""')}"`,
        s.countyCode ?? '',
        s.constituencyCode ?? '',
        s.wardCode ?? '',
        s.iebcStationCode ?? '',
        s.totalStations,
        s.stationsReporting,
        s.completionPercent.toFixed(2),
        s.registeredVoters,
        s.votesCast,
        s.validVotes,
        s.rejectedBallots,
        s.turnoutPercent.toFixed(2),
        s.avgAiConfidence?.toFixed(4) ?? '',
        s.anomalyCount,
        s.publicationStatus,
        s.publishedAt?.toISOString() ?? '',
      ].join(','));

      const csv = [header, ...rows].join('\n');

      // Update log as complete
      await this.exportLogRepo.update(log.id, {
        status:       ExportStatus.COMPLETE,
        rowCount:     snapshots.length,
        fileSizeBytes: Buffer.byteLength(csv, 'utf8'),
        completedAt:  new Date(),
      });

      return { csv, logId: log.id };
    } catch (err) {
      await this.exportLogRepo.update(log.id, {
        status:       ExportStatus.FAILED,
        errorMessage: String(err),
        completedAt:  new Date(),
      });
      throw err;
    }
  }

  /**
   * Request an async PDF or Excel export.
   * Returns export log ID; client polls GET /reports/exports/:id for status.
   * Actual file generation is done in a background job (setImmediate).
   */
  async requestAsyncExport(
    dto: ExportRequestDto,
    tenantId: string,
    requestedBy: string,
  ): Promise<ExportLog> {
    const log = await this.exportLogRepo.save(
      this.exportLogRepo.create({
        tenantId,
        requestedBy,
        exportFormat: dto.format,
        scopeLevel:   dto.scopeLevel ?? ScopeLevel.NATIONAL,
        positionCode: dto.positionCode,
        electionYear: dto.electionYear,
        countyCode:   dto.countyCode ?? null,
        status:       ExportStatus.PENDING,
      })
    );

    // Non-blocking: actual work happens in background
    setImmediate(() => this.processAsyncExport(log.id, dto, tenantId, requestedBy));
    return log;
  }

  async getExportLog(id: string): Promise<ExportLog> {
    const log = await this.exportLogRepo.findOne({ where: { id } });
    if (!log) throw new NotFoundException(`Export log ${id} not found`);
    return log;
  }

  // ══════════════════════════════════════════════════════════
  //  STATS
  // ══════════════════════════════════════════════════════════

  async getStats(tenantId: string): Promise<{
    totalSnapshots:    number;
    publishedCount:    number;
    verifiedCount:     number;
    draftCount:        number;
    totalPublications: number;
    totalExports:      number;
  }> {
    const [snapshotCounts, pubCount, exportCount] = await Promise.all([
      this.dataSource.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE publication_status = 'PUBLISHED') AS published,
          COUNT(*) FILTER (WHERE publication_status = 'VERIFIED')  AS verified,
          COUNT(*) FILTER (WHERE publication_status = 'DRAFT')     AS draft
        FROM reporting_result_snapshots
        WHERE tenant_id = $1
      `, [tenantId]),
      this.publicationRepo.count({ where: { tenantId } }),
      this.exportLogRepo.count({ where: { tenantId } }),
    ]);

    const row = snapshotCounts[0] ?? {};
    return {
      totalSnapshots:    parseInt(row.total    ?? '0', 10),
      publishedCount:    parseInt(row.published ?? '0', 10),
      verifiedCount:     parseInt(row.verified  ?? '0', 10),
      draftCount:        parseInt(row.draft     ?? '0', 10),
      totalPublications: pubCount,
      totalExports:      exportCount,
    };
  }

  // ══════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════

  private async fetchAggregateRows(
    tenantId: string,
    electionYear: number,
    positionCode: string,
    filter: ComputeSnapshotDto,
  ): Promise<AggregateRow[]> {
    let sql = `
      SELECT
        ec.iebc_station_code,
        ec.county_code,
        ec.county_name,
        ec.constituency_code,
        ec.constituency_name,
        ec.ward_code,
        ec.ward_name,
        ec.polling_station_name,
        ec.registered_voters::text,
        ec.status AS capsule_status,
        ec.ai_confidence_score::text,
        ec.ai_flagged::text,
        aj.extracted_votes_cast::text      AS votes_cast,
        aj.extracted_valid_votes::text     AS valid_votes,
        aj.extracted_rejected_votes::text  AS rejected_votes
      FROM evidence_capsules ec
      LEFT JOIN ai_verification_jobs aj ON aj.capsule_id = ec.id
      WHERE ec.tenant_id    = $1
        AND ec.election_year = $2
        AND ec.position_code = $3
        AND ec.is_deleted    = false
    `;

    const params: unknown[] = [tenantId, electionYear, positionCode];
    let paramIdx = 4;

    if (filter.countyCode) {
      sql += ` AND ec.county_code = $${paramIdx++}`;
      params.push(filter.countyCode);
    }
    if (filter.constituencyCode) {
      sql += ` AND ec.constituency_code = $${paramIdx++}`;
      params.push(filter.constituencyCode);
    }
    if (filter.wardCode) {
      sql += ` AND ec.ward_code = $${paramIdx++}`;
      params.push(filter.wardCode);
    }

    sql += ' ORDER BY ec.county_code, ec.constituency_code, ec.ward_code, ec.iebc_station_code';

    return this.dataSource.query(sql, params);
  }

  private buildSnapshot(opts: {
    tenantId:          string;
    electionId:        string | null;
    electionYear:      number;
    positionCode:      string;
    scopeLevel:        ScopeLevel;
    iebcStationCode?:  string;
    wardCode?:         string;
    constituencyCode?: string;
    countyCode?:       string;
    scopeName?:        string;
    rows:              AggregateRow[];
    totalStations:     number;
  }): Partial<ResultSnapshot> {
    const reportingRows = opts.rows.filter(
      (r) => REPORTING_STATUSES.includes(r.capsule_status)
    );
    const rejectedRows  = opts.rows.filter((r) => r.capsule_status === 'REJECTED');
    const flaggedRows   = opts.rows.filter((r) => r.ai_flagged === 'true');

    const stationsReporting = new Set(reportingRows.map((r) => r.iebc_station_code)).size;
    const stationsRejected  = new Set(rejectedRows.map((r) => r.iebc_station_code)).size;
    const stationsFlagged   = new Set(flaggedRows.map((r) => r.iebc_station_code)).size;

    const registeredVoters = reportingRows.reduce(
      (s, r) => s + parseInt(r.registered_voters ?? '0', 10), 0
    );
    const votesCast  = reportingRows.reduce(
      (s, r) => s + parseInt(r.votes_cast ?? '0', 10), 0
    );
    const validVotes = reportingRows.reduce(
      (s, r) => s + parseInt(r.valid_votes ?? '0', 10), 0
    );
    const rejectedBallots = reportingRows.reduce(
      (s, r) => s + parseInt(r.rejected_votes ?? '0', 10), 0
    );

    const confidenceValues = reportingRows
      .map((r) => parseFloat(r.ai_confidence_score ?? ''))
      .filter((v) => !isNaN(v));

    const avgAiConfidence = confidenceValues.length > 0
      ? confidenceValues.reduce((s, v) => s + v, 0) / confidenceValues.length
      : null;
    const minAiConfidence = confidenceValues.length > 0
      ? Math.min(...confidenceValues)
      : null;

    const completionPercent = opts.totalStations > 0
      ? parseFloat(((stationsReporting / opts.totalStations) * 100).toFixed(2))
      : 0;

    const turnoutPercent = registeredVoters > 0
      ? parseFloat(((votesCast / registeredVoters) * 100).toFixed(2))
      : 0;

    return {
      tenantId:          opts.tenantId,
      electionId:        opts.electionId,
      electionYear:      opts.electionYear,
      positionCode:      opts.positionCode,
      scopeLevel:        opts.scopeLevel,
      iebcStationCode:   opts.iebcStationCode ?? null,
      wardCode:          opts.wardCode ?? null,
      constituencyCode:  opts.constituencyCode ?? null,
      countyCode:        opts.countyCode ?? null,
      scopeName:         opts.scopeName ?? null,
      totalStations:     opts.totalStations,
      stationsReporting,
      stationsPending:   opts.totalStations - stationsReporting - stationsRejected,
      stationsRejected,
      stationsFlagged,
      completionPercent,
      registeredVoters,
      votesCast,
      validVotes,
      rejectedBallots,
      turnoutPercent,
      avgAiConfidence,
      minAiConfidence,
      anomalyCount:      flaggedRows.length,
      isFinal:           completionPercent >= 100,
      computedAt:        new Date(),
      publicationStatus: PublicationStatus.DRAFT,
    };
  }

  private groupBy<T>(arr: T[], key: (item: T) => string): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const item of arr) {
      const k = key(item);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(item);
    }
    return map;
  }

  private async upsertSnapshots(
    snapshots: Partial<ResultSnapshot>[],
    durationMs: number,
  ): Promise<void> {
    // Chunk into batches of 100
    const BATCH = 100;
    for (let i = 0; i < snapshots.length; i += BATCH) {
      const batch = snapshots.slice(i, i + BATCH);

      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(ResultSnapshot)
        .values(batch.map((s) => ({ ...s, computeDurationMs: durationMs })))
        .orUpdate(
          [
            'stations_reporting', 'stations_pending', 'stations_rejected',
            'stations_flagged', 'completion_percent', 'registered_voters',
            'votes_cast', 'valid_votes', 'rejected_ballots', 'turnout_percent',
            'avg_ai_confidence', 'min_ai_confidence', 'anomaly_count',
            'is_final', 'computed_at', 'compute_duration_ms', 'updated_at',
          ],
          [
            'tenant_id', 'election_year', 'position_code', 'scope_level',
            'COALESCE(iebc_station_code, \'\')',
            'COALESCE(ward_code, \'\')',
            'COALESCE(constituency_code, \'\')',
            'COALESCE(county_code, \'\')',
          ],
        )
        .execute();
    }
  }

  /** Background processing for PDF/Excel exports (stubbed for Phase 2 — S3 upload) */
  private async processAsyncExport(
    logId: string,
    dto: ExportRequestDto,
    tenantId: string,
    _requestedBy: string,
  ): Promise<void> {
    try {
      // Phase 2: generate PDF with pdfkit / Excel with exceljs and upload to S3
      // For now: generate CSV and mark complete
      const { csv } = await this.exportCsv(
        { ...dto, format: ExportFormat.CSV },
        tenantId,
        _requestedBy,
      );
      await this.exportLogRepo.update(logId, {
        status:       ExportStatus.COMPLETE,
        rowCount:     csv.split('\n').length - 1,
        fileSizeBytes: Buffer.byteLength(csv, 'utf8'),
        completedAt:  new Date(),
      });
    } catch (err) {
      this.logger.error(`Async export ${logId} failed: ${err}`);
      await this.exportLogRepo.update(logId, {
        status:       ExportStatus.FAILED,
        errorMessage: String(err),
        completedAt:  new Date(),
      });
    }
  }
}
