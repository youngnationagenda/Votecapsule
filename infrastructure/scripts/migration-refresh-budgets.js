/**
 * migration-refresh-budgets.js
 * ───────────────────────────────────────────────────────────────────────────
 * Does three things:
 *
 *  1. Adds missing DB columns:
 *       campaign_budget_categories.iebc_gazette_amount  (bigint)
 *       campaign_budget_categories.iebc_share_pct       (numeric(5,2))
 *       campaign_budgets.position                        (varchar 30)
 *
 *  2. Refreshes ALL existing campaign budgets with correct IEBC limits
 *     by inferring position from: goals.targetPosition → name hints → geography
 *
 *  3. Re-seeds the 11 gazette categories for every budget.
 *
 *  Rules:
 *   PRESIDENT → First Schedule KES 6,112,543,133 — national scope
 *   GOVERNOR / SENATOR / WOMEN_REP → Second Schedule (county limit)
 *   MP → Third Schedule (constituency limit)
 *   MCA → Fourth Schedule (ward limit)
 *   PARTY → Fifth Schedule KES 24,450,172,531 — exact gazette amounts
 * ───────────────────────────────────────────────────────────────────────────
 */
const pg = require('pg');

const DB = {
  host:                 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port:                 5432,
  database:             'votecapsule',
  user:                 'vcadmin',
  password:             'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl:                  { rejectUnauthorized: false },
  connectionTimeoutMillis: 120_000,
  query_timeout:        120_000,
};

// ── 11 Gazette categories (Fifth Schedule, GN 12251) ─────────
const IEBC_CATS = [
  { code: 'venues',          name: 'Venues for Campaign Rallies',         share: 1.5,  gazetteKes:    375_052_688 },
  { code: 'publicity',       name: 'Publicity Materials',                  share: 4.4,  gazetteKes:  1_066_714_464 },
  { code: 'advertising',     name: 'Advertising & Media',                  share: 10.3, gazetteKes:  2_517_509_489 },
  { code: 'personnel',       name: 'Campaign Personnel',                   share: 1.4,  gazetteKes:    332_922_614 },
  { code: 'agents',          name: 'Election Agents',                      share: 8.5,  gazetteKes:  2_081_162_296 },
  { code: 'transport',       name: 'Transportation',                       share: 66.0, gazetteKes: 16_126_632_035 },
  { code: 'communication',   name: 'Communication & Telephone',            share: 0.5,  gazetteKes:    134_230_217 },
  { code: 'nomination_fees', name: 'Nomination Fees',                      share: 0.9,  gazetteKes:    213_818_044 },
  { code: 'security',        name: 'Security',                             share: 1.2,  gazetteKes:    285_090_725 },
  { code: 'accommodation',   name: 'Accommodation & Travel',               share: 0.1,  gazetteKes:     24_945_438 },
  { code: 'administrative',  name: 'Administrative Cost',                  share: 5.3,  gazetteKes:  1_292_094_521 },
];

// ── IEBC gazette limits (direct from DB) ─────────────────────
// Fetched once at startup
let PRES_LIMIT      = 6_112_543_133;
let PARTY_LIMIT     = 24_450_172_531;
let COUNTY_LIMITS   = {};  // county_code → { governor, senator, women_rep }
let CONST_LIMITS    = {};  // constituency_code (int) → spending_limit_kes
let WARD_LIMITS     = {};  // ward_code → mca_spending_limit

// ── Name hints ────────────────────────────────────────────────
const NAME_HINTS = [
  { pattern: /\bpresident(ial)?\b/i, position: 'PRESIDENT'  },
  { pattern: /\bgovernor\b/i,        position: 'GOVERNOR'   },
  { pattern: /\bsenator\b/i,         position: 'SENATOR'    },
  { pattern: /\bwomen\s*(rep|member|mp|representative)\b/i, position: 'WOMEN_REP' },
  { pattern: /\bnational\s*assembly\b/i, position: 'MP'     },
  { pattern: /\b(mp|member\s+of\s+parliament)\b/i, position: 'MP' },
  { pattern: /\b(mca|ward\s*rep|county\s*assembly)\b/i, position: 'MCA' },
  { pattern: /\bparty\b/i,           position: 'PARTY'      },
];

function detectPosition(camp) {
  const goals = camp.goals || {};
  const explicit = goals.targetPosition || goals.position || goals.campaignType;
  if (explicit) return explicit.toString().toUpperCase().replace(/[\s\-]+/g,'_');

  if (camp.party_id && !camp.constituency_code && !camp.ward_code && !camp.county_code)
    return 'PARTY';

  const name = (camp.name || '').toUpperCase();
  for (const h of NAME_HINTS) {
    if (h.pattern.test(camp.name || '')) return h.position;
  }
  return null;
}

function resolveLimit(pos, camp) {
  switch (pos) {
    case 'PRESIDENT':  return PRES_LIMIT;
    case 'PARTY':      return PARTY_LIMIT;
    case 'GOVERNOR':   return COUNTY_LIMITS[camp.county_code]?.governor || null;
    case 'SENATOR':    return COUNTY_LIMITS[camp.county_code]?.senator || null;
    case 'WOMEN_REP':  return COUNTY_LIMITS[camp.county_code]?.women_rep || null;
    case 'MP':         return CONST_LIMITS[parseInt(camp.constituency_code, 10)] || null;
    case 'MCA': {
      const wc = (camp.ward_code || '').toString().padStart(4, '0');
      return WARD_LIMITS[wc] || null;
    }
    default: return null;
  }
}

function categoryAllocated(pos, limit, cat) {
  if (pos === 'PARTY') return cat.gazetteKes;                          // exact gazette amounts
  return Math.round(limit * (cat.share / 100));                        // proportional share
}

async function main() {
  const client = new pg.Client(DB);
  await client.connect();
  const q = (sql, p) => client.query(sql, p).then(r => r.rows);
  console.log('✓ Connected');

  // ── Step 1: Add missing columns ───────────────────────────
  console.log('\n── Step 1: Adding missing DB columns ──');
  const ddl = [
    `ALTER TABLE campaign_budget_categories
       ADD COLUMN IF NOT EXISTS iebc_gazette_amount bigint DEFAULT 0`,
    `ALTER TABLE campaign_budget_categories
       ADD COLUMN IF NOT EXISTS iebc_share_pct numeric(5,2) DEFAULT 0`,
    `ALTER TABLE campaign_budgets
       ADD COLUMN IF NOT EXISTS position varchar(30)`,
  ];
  for (const sql of ddl) {
    await client.query(sql).then(() => console.log('  ✓ ' + sql.trim().slice(0, 60) + '...'))
      .catch(e => console.log('  (skip) ' + e.message));
  }

  // ── Step 2: Load gazette limits from DB ───────────────────
  console.log('\n── Step 2: Loading gazette limits ──');

  const presRows = await q('SELECT spending_limit_kes FROM iebc_presidential_limit WHERE election_year=2027 LIMIT 1');
  if (presRows.length) PRES_LIMIT = Number(presRows[0].spending_limit_kes);
  console.log(`  Presidential:    KES ${PRES_LIMIT.toLocaleString()}`);

  const partyRows = await q('SELECT total_limit_kes FROM iebc_party_limits WHERE election_year=2027 LIMIT 1');
  if (partyRows.length) PARTY_LIMIT = Number(partyRows[0].total_limit_kes);
  console.log(`  Party:           KES ${PARTY_LIMIT.toLocaleString()}`);

  const countyRows = await q('SELECT county_code, governor_limit, senator_limit, women_rep_limit FROM iebc_county_limits WHERE election_year=2027');
  countyRows.forEach(r => {
    COUNTY_LIMITS[r.county_code.trim()] = {
      governor:  Number(r.governor_limit),
      senator:   Number(r.senator_limit),
      women_rep: Number(r.women_rep_limit),
    };
  });
  console.log(`  County limits:   ${countyRows.length} counties`);

  const constRows = await q('SELECT constituency_code, spending_limit_kes FROM iebc_constituency_limits WHERE election_year=2027');
  constRows.forEach(r => { CONST_LIMITS[parseInt(r.constituency_code, 10)] = Number(r.spending_limit_kes); });
  console.log(`  Constituency:    ${constRows.length} constituencies`);

  const wardRows = await q('SELECT ward_code, mca_spending_limit FROM iebc_ward_limits WHERE election_year=2027');
  wardRows.forEach(r => { WARD_LIMITS[r.ward_code.trim()] = Number(r.mca_spending_limit); });
  console.log(`  Ward limits:     ${wardRows.length} wards`);

  // ── Step 3: Load all campaigns ────────────────────────────
  console.log('\n── Step 3: Loading campaigns ──');
  const campaigns = await q(`
    SELECT id, tenant_id, name, county_code, constituency_code, ward_code, goals, party_id
    FROM campaigns ORDER BY created_at
  `);
  console.log(`  Total campaigns: ${campaigns.length}`);

  // ── Step 4: Refresh each campaign budget ─────────────────
  console.log('\n── Step 4: Refreshing campaign budgets ──');
  let updated = 0, skipped = 0, errored = 0, created = 0;

  for (const camp of campaigns) {
    try {
      const pos = detectPosition(camp);
      if (!pos) { skipped++; continue; }

      const limit = resolveLimit(pos, camp);
      if (!limit) {
        console.log(`  ⚠ ${camp.name} | pos=${pos} | no limit (missing geography?)`);
        skipped++;
        continue;
      }

      // Upsert budget
      const existing = await q(
        'SELECT id FROM campaign_budgets WHERE campaign_id=$1 AND tenant_id=$2 LIMIT 1',
        [camp.id, camp.tenant_id]
      );

      let budgetId;
      if (existing.length) {
        budgetId = existing[0].id;
        await client.query(
          `UPDATE campaign_budgets
           SET iebc_spending_limit = $1, position = $2, fiscal_year = 2027, updated_at = NOW()
           WHERE id = $3`,
          [limit, pos, budgetId]
        );
      } else {
        const ins = await client.query(
          `INSERT INTO campaign_budgets
             (campaign_id, tenant_id, iebc_spending_limit, position, total_allocated,
              total_committed, total_spent, currency, fiscal_year)
           VALUES ($1, $2, $3, $4, 0, 0, 0, 'KES', 2027)
           RETURNING id`,
          [camp.id, camp.tenant_id, limit, pos]
        );
        budgetId = ins.rows[0].id;
        created++;
      }

      // Seed / refresh 11 gazette categories
      for (const cat of IEBC_CATS) {
        const allocated = categoryAllocated(pos, limit, cat);
        await client.query(
          `INSERT INTO campaign_budget_categories
             (budget_id, campaign_id, tenant_id, category_code, category_name,
              allocated, committed, spent, iebc_gazette_amount, iebc_share_pct)
           VALUES ($1,$2,$3,$4,$5,$6,0,0,$7,$8)
           ON CONFLICT (budget_id, category_code)
           DO UPDATE SET
             category_name       = EXCLUDED.category_name,
             iebc_gazette_amount = EXCLUDED.iebc_gazette_amount,
             iebc_share_pct      = EXCLUDED.iebc_share_pct,
             allocated           = CASE
                                     WHEN campaign_budget_categories.allocated = 0
                                     THEN EXCLUDED.allocated
                                     ELSE campaign_budget_categories.allocated
                                   END,
             updated_at          = NOW()`,
          [budgetId, camp.id, camp.tenant_id, cat.code, cat.name,
           allocated, cat.gazetteKes, cat.share]
        );
      }

      // Sync total_allocated
      await client.query(
        `UPDATE campaign_budgets
         SET total_allocated = (
               SELECT COALESCE(SUM(allocated), 0)
               FROM campaign_budget_categories
               WHERE campaign_id=$1 AND tenant_id=$2
             ),
             updated_at = NOW()
         WHERE id = $3`,
        [camp.id, camp.tenant_id, budgetId]
      );

      // Write resolved limit back to goals
      await client.query(
        `UPDATE campaigns
         SET goals = goals || $1::jsonb, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify({
          targetPosition:    pos,
          iebcSpendingLimit: limit,
          iebcSchedule:      pos === 'PRESIDENT' ? 'First Schedule'
                           : pos === 'PARTY'     ? 'Fifth Schedule'
                           : ['GOVERNOR','SENATOR','WOMEN_REP'].includes(pos) ? 'Second Schedule'
                           : pos === 'MP'        ? 'Third Schedule'
                           : 'Fourth Schedule',
          iebcGazetteRef:    'GN 12251 (7 Aug 2026)',
          iebcIsNational:    ['PRESIDENT','PARTY'].includes(pos),
        }), camp.id]
      );

      const isNat = ['PRESIDENT','PARTY'].includes(pos);
      console.log(`  ✓ ${camp.name.padEnd(50)} | ${pos.padEnd(10)} | KES ${limit.toLocaleString()} ${isNat ? '🌍' : ''}`);
      updated++;
    } catch (e) {
      console.error(`  ✗ ${camp.name}: ${e.message}`);
      errored++;
    }
  }

  // ── Step 5: Verification ──────────────────────────────────
  console.log('\n── Step 5: Verification ──');

  const summary = await q(`
    SELECT
      cb.position,
      COUNT(*)                           AS campaigns,
      MIN(cb.iebc_spending_limit)::bigint AS min_limit,
      MAX(cb.iebc_spending_limit)::bigint AS max_limit
    FROM campaign_budgets cb
    WHERE cb.iebc_spending_limit > 0
    GROUP BY cb.position ORDER BY MAX(cb.iebc_spending_limit) DESC
  `);
  console.log('Budget limits by position:');
  summary.forEach(r => {
    console.log(
      `  ${(r.position||'?').padEnd(12)} | ${r.campaigns} campaigns | ` +
      `KES ${Number(r.min_limit).toLocaleString()} – ${Number(r.max_limit).toLocaleString()}`
    );
  });

  const catCheck = await q(`
    SELECT cbc.category_code, cbc.category_name,
           MIN(cbc.iebc_gazette_amount)::bigint min_gaz,
           MAX(cbc.iebc_gazette_amount)::bigint max_gaz,
           COUNT(*) cnt
    FROM campaign_budget_categories cbc
    WHERE cbc.iebc_gazette_amount > 0
    GROUP BY cbc.category_code, cbc.category_name
    ORDER BY MAX(cbc.iebc_gazette_amount) DESC
  `);
  console.log('\nBudget categories gazette amounts:');
  catCheck.forEach(r =>
    console.log(`  ${r.category_code.padEnd(20)} ${r.category_name.padEnd(40)} gazette=KES ${Number(r.max_gaz).toLocaleString()} (${r.cnt} records)`)
  );

  console.log(`\n════════════════════════════════════════════════════════`);
  console.log(`✅ Migration complete:`);
  console.log(`   ${updated} campaigns updated (${created} new budgets created)`);
  console.log(`   ${skipped} campaigns skipped (no position or geography)`);
  console.log(`   ${errored} errors`);
  console.log(`════════════════════════════════════════════════════════`);

  await client.end();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
