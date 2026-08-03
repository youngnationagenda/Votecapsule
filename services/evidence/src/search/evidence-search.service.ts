// ============================================================
// VoteCapsule — Evidence Search Service
// services/evidence/src/search/evidence-search.service.ts
//
// Indexes and searches EvidenceCapsule records in OpenSearch.
// Index: vote-capsule-evidence
//
// ALL calls are best-effort — failures are logged but never
// propagate to the caller. Evidence submission MUST NOT fail
// because of an OpenSearch outage.
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenSearchClientService } from './opensearch.client';
import type { EvidenceCapsule } from '../entities/evidence-capsule.entity';

export interface SearchResult {
  id:               string;
  iebcStationCode:  string;
  positionCode:     string;
  countyCode:       string;
  countyName:       string;
  status:           string;
  sha256Hash:       string | null;
  capturedAt:       string;
  anchoredAt:       string | null;
  aiConfidenceScore: number | null;
  aiFlagged:        boolean;
  electionYear:     number;
}

export interface SearchFilters {
  countyCode?:    string;
  positionCode?:  string;
  status?:        string;
  electionYear?:  number;
}

@Injectable()
export class EvidenceSearchService {
  private readonly logger = new Logger(EvidenceSearchService.name);
  private readonly index: string;

  constructor(
    private readonly osClient: OpenSearchClientService,
    private readonly config: ConfigService,
  ) {
    this.index = this.config.get<string>('OPENSEARCH_INDEX_EVIDENCE', 'vote-capsule-evidence');
  }

  /**
   * Upserts a capsule document into the OpenSearch index.
   * Called after: submitCapsule, recordAnchorCallback, approveOrReject.
   * Fire-and-forget safe — wrap every call in try/catch at the call site.
   */
  async indexCapsule(capsule: EvidenceCapsule): Promise<void> {
    const client = this.osClient.getClient();
    if (!client) {
      this.logger.debug(`OpenSearch unavailable — skipping index for capsule ${capsule.id}`);
      return;
    }

    const doc = {
      id:               capsule.id,
      iebcStationCode:  capsule.iebcStationCode,
      positionCode:     capsule.positionCode,
      countyCode:       capsule.countyCode,
      countyName:       capsule.countyName,
      constituencyCode: capsule.constituencyCode,
      constituencyName: capsule.constituencyName,
      wardCode:         capsule.wardCode,
      wardName:         capsule.wardName,
      pollingStationName: capsule.pollingStationName,
      tenantId:         capsule.tenantId,
      electionYear:     capsule.electionYear,
      status:           capsule.status,
      anchorStatus:     capsule.anchorStatus ?? null,
      sha256Hash:       capsule.sha256Hash ?? null,
      trustAnchorBatchId: capsule.trustAnchorBatchId ?? null,
      capturedAt:       capsule.capturedAt?.toISOString() ?? null,
      submittedAt:      capsule.submittedAt?.toISOString() ?? null,
      anchoredAt:       capsule.anchoredAt?.toISOString() ?? null,
      aiConfidenceScore: capsule.aiConfidenceScore ?? null,
      aiFlagged:        capsule.aiFlagged,
      validationDecision: capsule.validationDecision ?? null,
      agentUserId:      capsule.agentUserId,
    };

    try {
      await client.index({
        index:   this.index,
        id:      capsule.id,
        body:    doc,
        refresh: 'false', // async refresh — no need to block on this
      });
      this.logger.debug(`Indexed capsule ${capsule.id} (status=${capsule.status})`);
    } catch (err: unknown) {
      this.logger.error(
        `Failed to index capsule ${capsule.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      // Intentionally swallowed — OpenSearch failure must not break evidence submission
    }
  }

  /**
   * Full-text search over evidence capsules with optional filters.
   * Returns lightweight SearchResult objects (not full DB entities).
   */
  async searchCapsules(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const client = this.osClient.getClient();
    if (!client) {
      this.logger.warn('OpenSearch unavailable — search returning empty result');
      return [];
    }

    const must: unknown[] = [];
    const filter: unknown[] = [];

    if (query && query.trim().length > 0) {
      must.push({
        multi_match: {
          query,
          fields: [
            'iebcStationCode^3',
            'pollingStationName^2',
            'countyName^2',
            'constituencyName',
            'wardName',
            'positionCode',
            'status',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    } else {
      must.push({ match_all: {} });
    }

    if (filters?.countyCode) {
      filter.push({ term: { countyCode: filters.countyCode } });
    }
    if (filters?.positionCode) {
      filter.push({ term: { positionCode: filters.positionCode } });
    }
    if (filters?.status) {
      filter.push({ term: { status: filters.status } });
    }
    if (filters?.electionYear) {
      filter.push({ term: { electionYear: filters.electionYear } });
    }

    try {
      const response = await client.search({
        index: this.index,
        body: {
          query: {
            bool: { must, filter },
          },
          size: 100,
          _source: [
            'id', 'iebcStationCode', 'positionCode', 'countyCode', 'countyName',
            'status', 'sha256Hash', 'capturedAt', 'anchoredAt',
            'aiConfidenceScore', 'aiFlagged', 'electionYear',
          ],
        },
      });

      const hits: unknown[] =
        (response.body as { hits?: { hits?: unknown[] } })?.hits?.hits ?? [];

      return (hits as Array<{ _source?: SearchResult }>)
        .map((h) => h._source)
        .filter((s): s is SearchResult => s !== undefined);
    } catch (err: unknown) {
      this.logger.error(
        `Search failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }

  /**
   * Removes a capsule document from the index.
   * Only called for soft-deleted (isDeleted=true) capsules.
   * NOTE: Anchored capsules are immutable — never delete their index doc.
   */
  async deleteCapsule(id: string): Promise<void> {
    const client = this.osClient.getClient();
    if (!client) {
      this.logger.debug(`OpenSearch unavailable — skipping delete for capsule ${id}`);
      return;
    }

    try {
      await client.delete({
        index: this.index,
        id,
      });
      this.logger.debug(`Deleted capsule ${id} from index`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // 404 is expected if the capsule was never indexed (e.g., DRAFT deleted before upload)
      if (!errMsg.includes('404') && !errMsg.toLowerCase().includes('not_found')) {
        this.logger.error(`Failed to delete capsule ${id} from index: ${errMsg}`);
      }
    }
  }
}
