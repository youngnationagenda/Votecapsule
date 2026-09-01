// ============================================================
// VoteCapsule™ — Budget Auto-Turbulate Service
// Automatically creates + populates the campaign budget when a
// campaign is created or its position / geography changes.
//
// ── WHAT IT DOES ─────────────────────────────────────────────
//  1. Resolves the IEBC spending limit from position + geography
//  2. Upserts campaign_budgets.iebc_spending_limit
//  3. Seeds 11 IEBC gazette-category allocations:
//       • PARTY / PRESIDENT → uses actual gazette KES amounts
//         from the Fifth Schedule (GN 12251) as the "ceiling" per
//         category, scaled to the candidate's resolved limit.
//       • GOVERNOR/SENATOR/WOMEN_REP/MP/MCA → proportional shares
//         of the resolved single-position limit.
//  4. Updates campaign.goals with resolved limit metadata.
//
// ── POSITION DETECTION ───────────────────────────────────────
//  Primary:   campaign.goals.targetPosition  (set by frontend)
//  Fallback:  campaign.goals.position
//             campaign.goals.campaignType
//  Name hint: if goals are empty, parse the campaign name for
//             keywords (PRESIDENT, GOVERNOR, SENATOR, etc.)
//  Party:     party_id set + no constituency + no ward →
//             treated as PARTY campaign.
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CampaignBudget }         from './entities/campaign-budget.entity';
import { CampaignBudgetCategory } from './entities/campaign-budget-category.entity';
import {
  IEBCLimitService,
  IEBCLimitResult,
  PARTY_GAZETTE_CATEGORIES,
  PARTY_TOTAL_LIMIT,
} from './iebc-limit.service';

// ── 11 IEBC gazette categories (Fifth Schedule, GN 12251) ────
// These are the FIXED gazette line items — every position uses
// these same 11 categories, scaled to their specific IEBC limit.
const IEBC_CATEGORIES = [
  { code: 'venues',          name: 'Venues for Campaign Rallies',   share: 1.5,  gazetteKes:    375_052_688 },
  { code: 'publicity',       name: 'Publicity Materials',           share: 4.4,  gazetteKes:  1_066_714_464 },
  { code: 'advertising',     name: 'Advertising & Media',           share: 10.3, gazetteKes:  2_517_509_489 },
  { code: 'personnel',       name: 'Campaign Personnel',            share: 1.4,  gazetteKes:    332_922_614 },
  { code: 'agents',          name: 'Election Agents',               share: 8.5,  gazetteKes:  2_081_162_296 },
  { code: 'transport',       name: 'Transportation',                share: 66.0, gazetteKes: 16_126_632_035 },
  { code: 'communication',   name: 'Communication & Telephone',     share: 0.5,  gazetteKes:    134_230_217 },
  { code: 'nomination_fees', name: 'Nomination Fees',               share: 0.9,  gazetteKes:    213_818_044 },
  { code: 'security',        name: 'Security',                      share: 1.2,  gazetteKes:    285_090_725 },
  { code: 'accommodation',   name: 'Accommodation & Travel',        share: 0.1,  gazetteKes:     24_945_438 },
  { code: 'administrative',  name: 'Administrative Cost',           share: 5.3,  gazetteKes:  1_292_094_521 },
] as const;

// Position keywords in campaign name (fallback detection)
const NAME_POSITION_HINTS: Array<{ pattern: RegExp; position: string }> = [
  { pattern: /\bpresident(ial)?\b/i,          position: 'PRESIDENT'  },
  { pattern: /\bgovernor\b/i,                 position: 'GOVERNOR'   },
  { pattern: /\bsenator\b/i,                  position: 'SENATOR'    },
  { pattern: /\bwomen\s*(rep|member|mp)\b/i,  position: 'WOMEN_REP'  },
  { pattern: /\b(mp|member\s*of\s*parliament|national\s*assembly)\b/i, position: 'MP' },
  { pattern: /\b(mca|ward\s*rep|county\s*assembly)\b/i, position: 'MCA' },
  { pattern: /\bparty\b/i,                    position: 'PARTY'      },
];

export interface TurbulationResult {
  campaignId:        string;
  position:          string;
  iebcSpendingLimit: number;
  schedule:          string;
  gazetteRef:        string;
  geography: {
    countyCode?:       string;
    countyName?:       string;
    constituencyCode?: string;
    constituencyName?: string;
    wardCode?:         string;
    wardName?:         string;
    registeredVoters?: number;
    wardCount?:        number;
    pollingStations?:  number;
    nationalCountyTotal?: number;
    nationalConstTotal?:  number;
    nationalWardTotal?:   number;
  };
  budgetId:         string;
  categoriesSeeded: number;
  isNew:            boolean;
  isNational:       boolean;
  isPartyWide:      boolean;
}

@Injectable()
export class BudgetAutoService {
  private readonly logger = new Logger(BudgetAutoService.name);

  constructor(
    @InjectRepository(CampaignBudget)
    private readonly budgetRepo: Repository<CampaignBudget>,
    @InjectRepository(CampaignBudgetCategory)
    private readonly categoryRepo: Repository<CampaignBudgetCategory>,
    private readonly dataSource: DataSource,
    private readonly iebcLimitSvc: IEBCLimitService,
  ) {}

  // ── Detect position from campaign record ──────────────────
  private detectPosition(campaign: Record<string, unknown>): string | null {
    const goals = (campaign.goals as Record<string, unknown>) ?? {};

    // 1. Explicit goals fields
    const explicit =
      (goals.targetPosition as string) ??
      (goals.position as string) ??
      (goals.campaignType as string) ??
      null;
    if (explicit) return explicit;

    // 2. Party-wide heuristic: party set + no constituency + no ward
    if (
      campaign.party_id &&
      !campaign.constituency_code &&
      !campaign.ward_code &&
      !campaign.county_code
    ) {
      return 'PARTY';
    }

    // 3. Name keyword hints
    const name = (campaign.name as string) ?? '';
    for (const hint of NAME_POSITION_HINTS) {
      if (hint.pattern.test(name)) return hint.position;
    }

    return null;
  }

  /**
   * Main entry — called after campaign create or update.
   * Resolves position + geography → auto-turbulates budget.
   */
  async turbulateForCampaign(
    campaignId: string,
    tenantId: string,
  ): Promise<TurbulationResult | null> {
    // ── 1. Load campaign ──────────────────────────────────────
    const camps = await this.dataSource.query(
      `SELECT id, tenant_id, name, county_code, constituency_code,
              ward_code, goals, party_id
       FROM campaigns WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [campaignId, tenantId],
    );
    if (!camps.length) return null;
    const campaign = camps[0];

    const rawPosition = this.detectPosition(campaign);
    if (!rawPosition) {
      this.logger.debug(
        `Campaign ${campaignId} ("${campaign.name}"): no position detected, skipping turbulate`,
      );
      return null;
    }

    const isPartyWide =
      rawPosition.toUpperCase() === 'PARTY' ||
      (!!campaign.party_id &&
        !campaign.constituency_code &&
        !campaign.ward_code &&
        !campaign.county_code);

    // ── 2. Resolve IEBC limit ─────────────────────────────────
    const limit = await this.iebcLimitSvc.resolve(
      rawPosition,
      campaign.county_code,
      campaign.constituency_code,
      campaign.ward_code,
      isPartyWide,
    );

    if (!limit) {
      this.logger.warn(
        `Campaign ${campaignId}: could not resolve IEBC limit ` +
        `for position="${rawPosition}" county=${campaign.county_code} ` +
        `const=${campaign.constituency_code} ward=${campaign.ward_code}`,
      );
      return null;
    }

    this.logger.log(
      `Turbulate: campaign=${campaignId} ("${campaign.name}") ` +
      `position=${limit.position} ` +
      `limit=KES ${limit.spendingLimitKes.toLocaleString()} ` +
      `national=${limit.isNational}`,
    );

    // ── 3. Upsert campaign_budgets ────────────────────────────
    const existing = await this.budgetRepo.findOne({
      where: { campaignId, tenantId },
    });
    let budget: CampaignBudget;
    let isNew = false;

    if (existing) {
      existing.iebcSpendingLimit = limit.spendingLimitKes;
      budget = await this.budgetRepo.save(existing);
    } else {
      isNew = true;
      const entity = this.budgetRepo.create({
        campaignId,
        tenantId,
        iebcSpendingLimit: limit.spendingLimitKes,
        totalAllocated:    0,
        totalCommitted:    0,
        totalSpent:        0,
        currency:          'KES',
        fiscalYear:        2027,
      });
      budget = await this.budgetRepo.save(entity) as unknown as CampaignBudget;
    }

    // ── 4. Seed 11 IEBC gazette budget categories ─────────────
    //
    // For PARTY & PRESIDENT: use the ACTUAL gazette KES amounts as the
    // ceiling per category (Fifth Schedule exact figures).
    //
    // For all other positions: scale proportionally from the resolved limit
    // using the gazette percentage shares.
    //
    // UPSERT: only update the allocated amount if it is currently 0
    // (i.e., never overwrite amounts the user has already set).

    const isNational = limit.isNational;
    const resolvedLimit = limit.spendingLimitKes;

    let categoriesSeeded = 0;
    for (const cat of IEBC_CATEGORIES) {
      let allocated: number;

      if (isNational && (limit.position === 'PRESIDENT' || limit.position === 'PARTY')) {
        // Presidential / Party: use actual gazette per-category KES amounts
        // For PRESIDENT, scale party amounts proportionally to presidential limit
        if (limit.position === 'PRESIDENT') {
          allocated = Math.round(resolvedLimit * (cat.share / 100));
        } else {
          // PARTY: use exact gazette amounts
          allocated = cat.gazetteKes;
        }
      } else {
        // All other positions: proportion of the single-position limit
        allocated = Math.round(resolvedLimit * (cat.share / 100));
      }

      await this.dataSource.query(
        `INSERT INTO campaign_budget_categories
           (budget_id, campaign_id, tenant_id, category_code, category_name,
            allocated, committed, spent)
         VALUES ($1, $2, $3, $4, $5, $6, 0, 0)
         ON CONFLICT (budget_id, category_code)
         DO UPDATE SET
           category_name = EXCLUDED.category_name,
           allocated     = CASE
                             WHEN campaign_budget_categories.allocated = 0
                             THEN EXCLUDED.allocated
                             ELSE campaign_budget_categories.allocated
                           END,
           updated_at    = NOW()`,
        [budget.id, campaignId, tenantId, cat.code, cat.name, allocated],
      );
      categoriesSeeded++;
    }

    // Sync total_allocated to sum of category allocations
    await this.dataSource.query(
      `UPDATE campaign_budgets
       SET total_allocated = (
             SELECT COALESCE(SUM(allocated), 0)
             FROM campaign_budget_categories
             WHERE campaign_id = $1 AND tenant_id = $2
           ),
           iebc_spending_limit = $4,
           updated_at = NOW()
       WHERE id = $3`,
      [campaignId, tenantId, budget.id, resolvedLimit],
    );

    // ── 5. Persist limit metadata back to campaign.goals ──────
    await this.dataSource.query(
      `UPDATE campaigns
       SET goals = goals || $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      [
        JSON.stringify({
          iebcSpendingLimit:     resolvedLimit,
          iebcSchedule:          limit.schedule,
          iebcGazetteRef:        limit.gazetteRef,
          iebcPosition:          limit.position,
          iebcIsNational:        limit.isNational,
          iebcIsPartyWide:       limit.isPartyWide,
          registeredVoters:      limit.registeredVoters,
          wardCount:             limit.wardCount,
          pollingStations:       limit.pollingStations,
          countyName:            limit.countyName,
          constituencyName:      limit.constituencyName,
          wardName:              limit.wardName,
          nationalCountyTotal:   limit.nationalCountyTotal,
          nationalConstTotal:    limit.nationalConstTotal,
          nationalWardTotal:     limit.nationalWardTotal,
          targetPosition:        limit.position,  // ensure it is always set
        }),
        campaignId,
      ],
    ).catch((err) =>
      this.logger.warn(`Failed to update campaign.goals: ${err.message}`),
    );

    this.logger.log(
      `Budget turbulated: campaign=${campaignId} ` +
      `limit=KES ${resolvedLimit.toLocaleString()} ` +
      `categories=${categoriesSeeded} isNew=${isNew}`,
    );

    return {
      campaignId,
      position:          limit.position,
      iebcSpendingLimit: resolvedLimit,
      schedule:          limit.schedule,
      gazetteRef:        limit.gazetteRef,
      geography: {
        countyCode:          limit.countyCode,
        countyName:          limit.countyName,
        constituencyCode:    limit.constituencyCode,
        constituencyName:    limit.constituencyName,
        wardCode:            limit.wardCode,
        wardName:            limit.wardName,
        registeredVoters:    limit.registeredVoters,
        wardCount:           limit.wardCount,
        pollingStations:     limit.pollingStations,
        nationalCountyTotal: limit.nationalCountyTotal,
        nationalConstTotal:  limit.nationalConstTotal,
        nationalWardTotal:   limit.nationalWardTotal,
      },
      budgetId:          budget.id,
      categoriesSeeded,
      isNew,
      isNational:        limit.isNational ?? false,
      isPartyWide:       limit.isPartyWide,
    };
  }

  /**
   * Preview — returns IEBC limit for position + geography
   * WITHOUT writing to DB.
   */
  async previewLimit(
    rawPosition:      string,
    countyCode?:      string,
    constituencyCode?: string,
    wardCode?:        string,
    isParty?:         boolean,
  ): Promise<IEBCLimitResult | null> {
    return this.iebcLimitSvc.resolve(
      rawPosition,
      countyCode,
      constituencyCode,
      wardCode,
      isParty,
    );
  }

  /**
   * Bulk re-turbulate all existing campaigns that have geography
   * set but missing/stale IEBC limits. Called from the DB migration script.
   */
  async returbulateAll(): Promise<{ updated: number; skipped: number; errors: number }> {
    const campaigns = await this.dataSource.query(
      `SELECT id, tenant_id, name, county_code, constituency_code,
              ward_code, goals, party_id
       FROM campaigns
       WHERE county_code IS NOT NULL
          OR constituency_code IS NOT NULL
          OR ward_code IS NOT NULL
          OR party_id IS NOT NULL`,
    );

    let updated = 0, skipped = 0, errors = 0;

    for (const camp of campaigns) {
      try {
        const result = await this.turbulateForCampaign(camp.id, camp.tenant_id);
        if (result) {
          updated++;
        } else {
          skipped++;
        }
      } catch (err: unknown) {
        this.logger.error(
          `Failed to turbulate campaign ${camp.id} (${camp.name}): ${(err as Error).message}`,
        );
        errors++;
      }
    }

    this.logger.log(
      `Re-turbulate all: ${updated} updated, ${skipped} skipped, ${errors} errors`,
    );
    return { updated, skipped, errors };
  }
}
