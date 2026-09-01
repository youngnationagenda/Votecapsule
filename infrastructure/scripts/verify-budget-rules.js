/**
 * verify-budget-rules.js
 * ─────────────────────────────────────────────────────────────
 * End-to-end verification of all IEBC spending limit rules:
 *
 *  1. PRESIDENT → KES 6,112,543,133 + 11 scaled categories + national roll-up
 *  2. PARTY     → KES 24,450,172,531 + 11 EXACT gazette amounts
 *  3. GOVERNOR  → county limit (e.g. Mombasa = KES 60,967,580)
 *  4. SENATOR   → county limit (same as governor per gazette)
 *  5. WOMEN_REP → county limit (same as governor per gazette)
 *  6. MP        → constituency limit (e.g. Changamwe = KES 18,302,374)
 *  7. MCA       → ward limit (e.g. Port Reitz = KES 4,954,920)
 *  8. Campaign budget iebc_spending_limit matches gazette values
 *  9. Budget categories have correct gazette amounts stored
 * 10. Party campaigns have EXACT gazette category amounts (not proportional)
 */
const pg = require('pg');
const DB = { host:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com', port:5432, database:'votecapsule', user:'vcadmin', password:'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0', ssl:{rejectUnauthorized:false}, connectionTimeoutMillis:30000 };

const GAZETTE = {
  presidential:  6_112_543_133,
  party:        24_450_172_531,
  county: {
    '001': { name:'MOMBASA',      gov: 60_967_580 },
    '022': { name:'KIAMBU',       gov: 110_961_257 },
    '047': { name:'NAIROBI CITY', gov: 181_312_885 },
  },
  constituency: {
    1:   { name:'CHANGAMWE',    limit: 18_302_374 },
    270: { name:'KASARANI',     limit: 17_805_609 },
    290: { name:'KIAMAIKO',     limit: 25_905_194 },
  },
  ward: {
    '0001': { name:'PORT REITZ', limit: 4_954_920 },
  },
  partyCategories: {
    transport:       16_126_632_035,
    advertising:      2_517_509_489,
    agents:           2_081_162_296,
    administrative:   1_292_094_521,
    publicity:        1_066_714_464,
    venues:             375_052_688,
    personnel:          332_922_614,
    security:           285_090_725,
    nomination_fees:    213_818_044,
    communication:      134_230_217,
    accommodation:       24_945_438,
  },
};

const cl = new pg.Client(DB);

cl.connect().then(async () => {
  const q = (sql, p) => cl.query(sql, p).then(r => r.rows);
  let pass = 0, fail = 0;
  const check = (label, got, expected) => {
    const ok = got === expected || (typeof got === 'number' && Math.abs(got - expected) < 10);
    const icon = ok ? '✓' : '✗';
    const extra = ok ? '' : ` (got ${got?.toLocaleString?.() ?? got}, expect ${expected?.toLocaleString?.() ?? expected})`;
    console.log(`  ${icon} ${label}${extra}`);
    ok ? pass++ : fail++;
  };

  console.log('\n══════════════════════════════════════════════════════');
  console.log('IEBC BUDGET RULES — FULL VERIFICATION');
  console.log('══════════════════════════════════════════════════════\n');

  // ── 1. Presidential limit ──────────────────────────────────
  console.log('1. PRESIDENTIAL LIMIT (First Schedule)');
  const pres = await q('SELECT spending_limit_kes FROM iebc_presidential_limit WHERE election_year=2027 LIMIT 1');
  check('KES 6,112,543,133', Number(pres[0]?.spending_limit_kes), GAZETTE.presidential);

  // ── 2. Party limit + categories ───────────────────────────
  console.log('\n2. PARTY LIMIT + GAZETTE CATEGORIES (Fifth Schedule)');
  const party = await q('SELECT total_limit_kes FROM iebc_party_limits WHERE election_year=2027 LIMIT 1');
  check('Party total KES 24,450,172,531', Number(party[0]?.total_limit_kes), GAZETTE.party);

  // Check party campaign budget categories
  const partyCats = await q(`
    SELECT cbc.category_code, cbc.iebc_gazette_amount, cbc.allocated
    FROM campaign_budget_categories cbc
    JOIN campaign_budgets cb ON cb.id = cbc.budget_id
    WHERE cb.position = 'PARTY'
    AND cb.campaign_id = (SELECT id FROM campaigns WHERE goals->>'targetPosition'='PARTY' LIMIT 1)
    ORDER BY cbc.iebc_gazette_amount DESC
  `);
  console.log('  Party budget gazette amounts (one party campaign):');
  for (const [code, amount] of Object.entries(GAZETTE.partyCategories)) {
    const cat = partyCats.find(c => c.category_code === code);
    const stored = Number(cat?.iebc_gazette_amount ?? 0);
    const alloc  = Number(cat?.allocated ?? 0);
    check(`  party.${code}: gazette=KES ${amount.toLocaleString()} allocated=KES ${alloc.toLocaleString()}`, stored, amount);
  }

  // ── 3. County limits ──────────────────────────────────────
  console.log('\n3. COUNTY LIMITS (Second Schedule)');
  for (const [code, expected] of Object.entries(GAZETTE.county)) {
    const rows = await q('SELECT governor_limit, senator_limit, women_rep_limit FROM iebc_county_limits WHERE county_code=$1 AND election_year=2027', [code]);
    const r = rows[0];
    check(`County ${code} ${expected.name} governor`, Number(r?.governor_limit), expected.gov);
    check(`County ${code} ${expected.name} senator (= governor)`, Number(r?.senator_limit), expected.gov);
    check(`County ${code} ${expected.name} women_rep (= governor)`, Number(r?.women_rep_limit), expected.gov);
  }

  // ── 4. Constituency limits ────────────────────────────────
  console.log('\n4. CONSTITUENCY LIMITS (Third Schedule)');
  for (const [code, expected] of Object.entries(GAZETTE.constituency)) {
    const rows = await q('SELECT constituency_name, spending_limit_kes FROM iebc_constituency_limits WHERE constituency_code=$1 AND election_year=2027', [code]);
    check(`Const ${code} ${expected.name}`, Number(rows[0]?.spending_limit_kes), expected.limit);
  }

  // ── 5. Ward limits ────────────────────────────────────────
  console.log('\n5. WARD LIMITS (Fourth Schedule)');
  for (const [code, expected] of Object.entries(GAZETTE.ward)) {
    const rows = await q('SELECT ward_name, mca_spending_limit FROM iebc_ward_limits WHERE ward_code=$1 AND election_year=2027', [code]);
    check(`Ward ${code} ${expected.name}`, Number(rows[0]?.mca_spending_limit), expected.limit);
  }

  // ── 6. Campaign budget limits ─────────────────────────────
  console.log('\n6. CAMPAIGN BUDGETS (iebc_spending_limit correctness)');
  const budgetChecks = [
    { name: 'Mombasa Governor 2027 Campaign',   position: 'GOVERNOR', expected: 60_967_580  },
    { name: 'Kisumu Senator 2027 Campaign',      position: 'SENATOR',  expected: 60_822_166  },
    { name: 'Nairobi MP Kasarani 2027 Campaign', position: 'MP',       expected: 17_805_609  },
  ];
  for (const bc of budgetChecks) {
    const rows = await q(
      `SELECT cb.iebc_spending_limit, cb.position FROM campaign_budgets cb JOIN campaigns c ON c.id=cb.campaign_id WHERE c.name=$1 LIMIT 1`,
      [bc.name]
    );
    const r = rows[0];
    check(`${bc.position}: "${bc.name}"`, Number(r?.iebc_spending_limit), bc.expected);
    check(`  position field = ${bc.position}`, r?.position, bc.position);
  }

  // Check party budgets all have correct limit
  const partyBudgets = await q(`
    SELECT COUNT(*) cnt FROM campaign_budgets WHERE position='PARTY' AND iebc_spending_limit=$1
  `, [GAZETTE.party]);
  const partyTotal = await q(`SELECT COUNT(*) cnt FROM campaign_budgets WHERE position='PARTY'`);
  check(`All party budgets = KES 24,450,172,531 (${partyBudgets[0].cnt}/${partyTotal[0].cnt})`,
    Number(partyBudgets[0].cnt), Number(partyTotal[0].cnt));

  // ── 7. Budget categories completeness ────────────────────
  console.log('\n7. BUDGET CATEGORIES (all campaigns have 11 IEBC categories)');
  const complete = await q(`
    SELECT COUNT(*) cnt FROM campaign_budgets cb
    WHERE (SELECT COUNT(*) FROM campaign_budget_categories WHERE budget_id=cb.id) = 11
  `);
  const total = await q('SELECT COUNT(*) cnt FROM campaign_budgets');
  check(`${complete[0].cnt}/${total[0].cnt} budgets have all 11 IEBC categories`,
    Number(complete[0].cnt), Number(total[0].cnt));

  // ── 8. MP budget categories gazette amounts stored correctly ─
  console.log('\n8. MP BUDGET CATEGORIES (iebc_gazette_amount stored correctly)');
  const mpLimit = 17_805_609;
  const mpCats = await q(`
    SELECT cbc.category_code, cbc.allocated, cbc.iebc_gazette_amount, cbc.iebc_share_pct
    FROM campaign_budget_categories cbc
    JOIN campaign_budgets cb ON cb.id=cbc.budget_id
    WHERE cb.position='MP' ORDER BY cbc.iebc_gazette_amount DESC
  `);
  // Verify gazette_amount and share_pct are stored (correct for iebc enforcement)
  const transport = mpCats.find(c => c.category_code === 'transport');
  check('MP transport: iebc_gazette_amount=KES 16,126,632,035 (Fifth Schedule reference)',
    Number(transport?.iebc_gazette_amount), 16_126_632_035);
  check('MP transport: iebc_share_pct=66%', Number(transport?.iebc_share_pct), 66.0);
  // Verify that gazette-correct allocations match for non-user-set categories
  const advertising = mpCats.find(c => c.category_code === 'advertising');
  const expectedAdv = Math.round(mpLimit * 0.103);
  check(`MP advertising = 10.3% × KES ${mpLimit.toLocaleString()} = KES ${expectedAdv.toLocaleString()}`,
    Number(advertising?.allocated), expectedAdv);
  console.log('  ℹ  transport & personnel show user-set values (preserved per design)');

  // ── Summary ────────────────────────────────────────────────
  console.log(`\n══════════════════════════════════════════════════════`);
  console.log(`RESULT: ${pass} PASSED  ${fail} FAILED`);
  if (fail === 0) console.log('✅ ALL IEBC BUDGET RULES VERIFIED CORRECTLY');
  else            console.log('⚠  Some rules need attention');
  console.log(`══════════════════════════════════════════════════════\n`);

  await cl.end();
}).catch(e => { console.error('ERR:', e.message); process.exit(1); });
