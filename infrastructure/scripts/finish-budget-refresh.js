/**
 * finish-budget-refresh.js
 * Completes the budget refresh for campaigns that still have:
 *  1. Missing targetPosition in goals
 *  2. Missing budget categories
 * Uses fast bulk SQL.
 */
const pg = require('pg');
const DB = { host:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com', port:5432, database:'votecapsule', user:'vcadmin', password:'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0', ssl:{rejectUnauthorized:false}, connectionTimeoutMillis:60000 };

const IEBC_CATS = [
  { code: 'venues',          name: 'Venues for Campaign Rallies',   share: 1.5,  gazetteKes:    375052688 },
  { code: 'publicity',       name: 'Publicity Materials',           share: 4.4,  gazetteKes:   1066714464 },
  { code: 'advertising',     name: 'Advertising & Media',           share: 10.3, gazetteKes:   2517509489 },
  { code: 'personnel',       name: 'Campaign Personnel',            share: 1.4,  gazetteKes:    332922614 },
  { code: 'agents',          name: 'Election Agents',               share: 8.5,  gazetteKes:   2081162296 },
  { code: 'transport',       name: 'Transportation',                share: 66.0, gazetteKes:  16126632035 },
  { code: 'communication',   name: 'Communication & Telephone',     share: 0.5,  gazetteKes:    134230217 },
  { code: 'nomination_fees', name: 'Nomination Fees',               share: 0.9,  gazetteKes:    213818044 },
  { code: 'security',        name: 'Security',                      share: 1.2,  gazetteKes:    285090725 },
  { code: 'accommodation',   name: 'Accommodation & Travel',        share: 0.1,  gazetteKes:     24945438 },
  { code: 'administrative',  name: 'Administrative Cost',           share: 5.3,  gazetteKes:   1292094521 },
];

const PARTY_LIMIT     = 24450172531;
const PRES_LIMIT      = 6112543133;

const NAME_HINTS = [
  { pattern: /\bpresident(ial)?\b/i, position: 'PRESIDENT' },
  { pattern: /\bgovernor\b/i,        position: 'GOVERNOR'  },
  { pattern: /\bsenator\b/i,         position: 'SENATOR'   },
  { pattern: /\bwomen\s*(rep|member|mp|representative)\b/i, position: 'WOMEN_REP' },
  { pattern: /\bnational\s*assembly\b/i, position: 'MP'    },
  { pattern: /\b(mp|member\s+of\s+parliament)\b/i, position: 'MP' },
  { pattern: /\b(mca|ward\s*rep|county\s*assembly)\b/i, position: 'MCA' },
  { pattern: /\bparty\b/i,           position: 'PARTY'     },
];

const cl = new pg.Client(DB);
cl.connect().then(async () => {
  const q = (sql, p) => cl.query(sql, p).then(r => r.rows);
  console.log('✓ Connected');

  // 1. Set targetPosition in goals for campaigns that still lack it
  console.log('\n── Fixing missing targetPosition in goals ──');
  const allCamps = await q('SELECT id, name, party_id, county_code, constituency_code, ward_code, goals FROM campaigns');
  
  let goalsFixed = 0;
  for (const camp of allCamps) {
    const goals = camp.goals || {};
    if (goals.targetPosition) continue; // already set
    
    // Detect from name or party heuristic
    let pos = null;
    if (camp.party_id && !camp.constituency_code && !camp.ward_code && !camp.county_code) {
      pos = 'PARTY';
    } else {
      for (const h of NAME_HINTS) {
        if (h.pattern.test(camp.name || '')) { pos = h.position; break; }
      }
    }
    if (!pos) continue;
    
    await cl.query(
      `UPDATE campaigns SET goals = goals || $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify({ targetPosition: pos }), camp.id]
    );
    goalsFixed++;
  }
  console.log(`  ✓ Fixed targetPosition for ${goalsFixed} campaigns`);

  // 2. Load gazette limits
  const countyRows = await q('SELECT county_code, governor_limit, senator_limit, women_rep_limit FROM iebc_county_limits WHERE election_year=2027');
  const COUNTY = {};
  countyRows.forEach(r => { COUNTY[r.county_code.trim()] = { governor: Number(r.governor_limit), senator: Number(r.senator_limit), women_rep: Number(r.women_rep_limit) }; });
  
  const constRows = await q('SELECT constituency_code, spending_limit_kes FROM iebc_constituency_limits WHERE election_year=2027');
  const CONST = {};
  constRows.forEach(r => { CONST[parseInt(r.constituency_code)] = Number(r.spending_limit_kes); });
  
  const wardRows = await q('SELECT ward_code, mca_spending_limit FROM iebc_ward_limits WHERE election_year=2027');
  const WARD = {};
  wardRows.forEach(r => { WARD[r.ward_code.trim()] = Number(r.mca_spending_limit); });

  // 3. Find budgets missing categories
  console.log('\n── Seeding missing budget categories ──');
  const budgets = await q(`
    SELECT cb.id, cb.campaign_id, cb.tenant_id, cb.iebc_spending_limit, cb.position,
           c.name, c.party_id
    FROM campaign_budgets cb
    JOIN campaigns c ON c.id = cb.campaign_id
  `);
  
  let catSeeded = 0;
  for (const bud of budgets) {
    // Count existing categories
    const catCount = await q('SELECT COUNT(*) cnt FROM campaign_budget_categories WHERE budget_id=$1', [bud.id]);
    if (Number(catCount[0].cnt) >= 11) continue; // already fully seeded

    const pos = bud.position || 'PARTY';
    const limit = Number(bud.iebc_spending_limit);
    if (!limit) continue;

    for (const cat of IEBC_CATS) {
      const allocated = pos === 'PARTY' ? cat.gazetteKes : Math.round(limit * (cat.share / 100));
      await cl.query(
        `INSERT INTO campaign_budget_categories
           (budget_id, campaign_id, tenant_id, category_code, category_name,
            allocated, committed, spent, iebc_gazette_amount, iebc_share_pct)
         VALUES ($1,$2,$3,$4,$5,$6,0,0,$7,$8)
         ON CONFLICT (budget_id, category_code)
         DO UPDATE SET
           category_name       = EXCLUDED.category_name,
           iebc_gazette_amount = EXCLUDED.iebc_gazette_amount,
           iebc_share_pct      = EXCLUDED.iebc_share_pct,
           allocated           = CASE WHEN campaign_budget_categories.allocated = 0 THEN EXCLUDED.allocated ELSE campaign_budget_categories.allocated END,
           updated_at          = NOW()`,
        [bud.id, bud.campaign_id, bud.tenant_id, cat.code, cat.name, allocated, cat.gazetteKes, cat.share]
      );
    }
    // Sync total_allocated
    await cl.query(
      `UPDATE campaign_budgets SET total_allocated=(SELECT COALESCE(SUM(allocated),0) FROM campaign_budget_categories WHERE budget_id=$1), updated_at=NOW() WHERE id=$1`,
      [bud.id]
    );
    catSeeded++;
  }
  console.log(`  ✓ Seeded categories for ${catSeeded} budgets`);

  // 4. Final summary
  console.log('\n── Final Summary ──');
  const summary = await q(`
    SELECT cb.position, COUNT(DISTINCT cb.id) budgets,
           MIN(cb.iebc_spending_limit)::bigint min_lim,
           MAX(cb.iebc_spending_limit)::bigint max_lim
    FROM campaign_budgets cb WHERE cb.iebc_spending_limit > 0
    GROUP BY cb.position ORDER BY MAX(cb.iebc_spending_limit) DESC
  `);
  summary.forEach(r => {
    const pos = (r.position || '?').padEnd(12);
    console.log(`  ${pos} | ${r.budgets} budgets | KES ${Number(r.min_lim).toLocaleString()} – ${Number(r.max_lim).toLocaleString()}`);
  });

  const catSummary = await q(`
    SELECT cbc.category_code, cbc.category_name,
           MAX(cbc.iebc_gazette_amount)::bigint gazette_kes, COUNT(*) cnt
    FROM campaign_budget_categories cbc
    GROUP BY cbc.category_code, cbc.category_name
    ORDER BY MAX(cbc.iebc_gazette_amount) DESC
  `);
  console.log('\nCategory gazette amounts (max across all budgets):');
  catSummary.forEach(r => {
    console.log(`  ${r.category_code.padEnd(20)} ${r.category_name.padEnd(40)} | max KES ${Number(r.gazette_kes).toLocaleString()} | ${r.cnt} records`);
  });

  // Count budgets with all 11 categories
  const complete = await q(`
    SELECT COUNT(*) cnt FROM campaign_budgets cb
    WHERE (SELECT COUNT(*) FROM campaign_budget_categories WHERE budget_id=cb.id) = 11
  `);
  const total = await q('SELECT COUNT(*) cnt FROM campaign_budgets');
  console.log(`\nBudgets with all 11 IEBC categories: ${complete[0].cnt}/${total[0].cnt}`);

  console.log('\n✅ Budget refresh complete!');
  await cl.end();
}).catch(e => { console.error('ERR:', e.message); process.exit(1); });
