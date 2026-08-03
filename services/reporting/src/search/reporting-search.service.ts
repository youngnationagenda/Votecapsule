// ============================================================
// VoteCapsule — Reporting Search Service
// services/reporting/src/search/reporting-search.service.ts
//
// Queries OpenSearch for fast result aggregates.
// Index: vote-capsule-results
//
// Falls back to SQL (snapshotRepo) if OpenSearch is unavailable
// or returns an error — the SQL path always produces correct results.
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { ResultSnapshot, ScopeLevel, PublicationStatus } from '../entities/result-snapshot.entity';

export interface ProgressResult {
  electionYear:     number;
  positionCode:     string;
  totalStations:    number;
  stationsReported: number;
  percentReported:  number;
  source:           'opensearch' | 'sql';
}

@Injectable()
export class ReportingSearchService {
  private readonly logger = new Logger(ReportingSearchService.name);
  private client: Client | null = null;
  private readonly resultsIndex: string;

  constructor(
    private readonly config: ConfigService,

    @InjectRepository(ResultSnapshot)
    private readonly snapshotRepo: Repository<ResultSnapshot>,
  ) {
    this.resultsIndex = this.config.get<string>(
      'OPENSEARCH_INDEX_RESULTS',
      'vote-capsule-results',
    );
    this.initClient();
  }

  private initClient(): void {
    const endpoint = this.config.get<string>('OPENSEARCH_ENDPOINT');
    const region   = this.config.get<string>('OPENSEARCH_REGION', 'us-east-1');

    if (!endpoint) {
      this.logger.warn(
        'OPENSEARCH_ENDPOINT not set — Reporting will use SQL fallback for progress queries.',
      );
      return;
    }

    try {
      this.client = new Client({
        ...AwsSigv4Signer({
          region,
          service: 'es',
          getCredentials: () => {
            const credentialsProvider = defaultProvider();
            return credentialsProvider();
          },
        }),
        node: endpoint,
      });
      this.logger.log(`ReportingSearchService: OpenSearch client ready → ${endpoint}`);
    } catch (err: unknown) {
      this.logger.error(
        `Failed to initialise OpenSearch client for reporting: ${err instanceof Error ? err.message : String(err)}`,
      );
      this.client = null;
    }
  }

  /**
   * Returns station-level submission/anchor progress for a given election + position.
   *
   * Primary path: OpenSearch aggregation on `vote-capsule-evidence` index.
   * Fallback path: SQL query against reporting_result_snapshots (existing snapshotRepo).
   *
   * The fallback is triggered automatically on any OpenSearch error or when
   * the client is unavailable.
   */
  async getStationProgress(
    electionYear: number,
    positionCode: string,
  ): Promise<ProgressResult> {
    if (this.client) {
      try {
        return await this.getProgressFromOpenSearch(electionYear, positionCode);
      } catch (err: unknown) {
        this.logger.warn(
          `OpenSearch progress query failed (${err instanceof Error ? err.message : String(err)}) — falling back to SQL`,
        );
        // Fall through to SQL
      }
    }

    return this.getProgressFromSql(electionYear, positionCode);
  }

  // ── Private: OpenSearch aggregation ──────────────────────

  private async getProgressFromOpenSearch(
    electionYear: number,
    positionCode: string,
  ): Promise<ProgressResult> {
    // Use the evidence index for raw progress (all submissions regardless of snapshot)
    const evidenceIndex = this.config.get<string>(
      'OPENSEARCH_INDEX_EVIDENCE',
      'vote-capsule-evidence',
    );

    const response = await this.client!.search({
      index: evidenceIndex,
      body: {
        query: {
          bool: {
            filter: [
              { term: { electionYear } },
              { term: { positionCode } },
            ],
          },
        },
        size: 0,
        aggs: {
          total_stations: {
            cardinality: { field: 'iebcStationCode' },
          },
          reported_stations: {
            filter: {
              terms: { status: ['ANCHORED', 'PUBLISHED'] },
            },
            aggs: {
              unique: {
                cardinality: { field: 'iebcStationCode' },
              },
            },
          },
        },
      },
    });

    type AggResponse = {
      aggregations?: {
        total_stations?: { value?: number };
        reported_stations?: { unique?: { value?: number } };
      };
    };

    const aggs = (response.body as AggResponse)?.aggregations ?? {};
    const total    = aggs.total_stations?.value    ?? 0;
    const reported = aggs.reported_stations?.unique?.value ?? 0;
    const percent  = total > 0
      ? Math.round((reported / total) * 10000) / 100
      : 0;

    return {
      electionYear,
      positionCode,
      totalStations:    total,
      stationsReported: reported,
      percentReported:  percent,
      source:           'opensearch',
    };
  }

  // ── Private: SQL fallback ─────────────────────────────────

  private async getProgressFromSql(
    electionYear: number,
    positionCode: string,
  ): Promise<ProgressResult> {
    const national = await this.snapshotRepo.findOne({
      where: {
        electionYear,
        positionCode,
        scopeLevel:        ScopeLevel.NATIONAL,
        publicationStatus: PublicationStatus.PUBLISHED,
      },
      order: { computedAt: 'DESC' },
    });

    const total    = national?.totalStations    ?? 0;
    const reported = national?.stationsReporting ?? 0;
    const percent  = total > 0
      ? Math.round((reported / total) * 10000) / 100
      : 0;

    return {
      electionYear,
      positionCode,
      totalStations:    total,
      stationsReported: reported,
      percentReported:  percent,
      source:           'sql',
    };
  }
}
