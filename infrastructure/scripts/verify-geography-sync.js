// verify-geography-sync.js — verify migration 172 results
const { Client } = require('pg');

const DB_CONFIG = {
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'votecapsule',
  user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
};

async function main() {
  const c = new Client(DB_CONFIG);
  await c.connect();
  console.log('Connected.\n');

  // ── 1. Voter totals at each level ──────────────────────────
  const totals = await c.query(`
    SELECT 
      (SELECT SUM(registered_voters) FROM nec_polling_stations WHERE is_special=false AND active=true) AS ps_total,
      (SELECT SUM(registered_voters) FROM nec_wards              WHERE is_special=false AND active=true) AS ward_total,
      (SELECT SUM(registered_voters) FROM nec_constituencies      WHERE is_special=false AND active=true) AS const_total,
      (SELECT SUM(registered_voters) FROM nec_counties            WHERE is_special=false AND active=true) AS county_total
  `);
  const { ps_total, ward_total, const_total, county_total } = totals.rows[0];
  console.log('=== REGISTERED VOTER TOTALS ===');
  console.log('Polling stations (ground truth):', Number(ps_total).toLocaleString());
  console.log('Wards (synced from PS):          ', Number(ward_total).toLocaleString(), ward_total == ps_total ? '✅ MATCH' : `❌ DIFF: ${Math.abs(ward_total - ps_total).toLocaleString()}`);
  console.log('Constituencies (synced from ward):', Number(const_total).toLocaleString(), const_total == ward_total ? '✅ MATCH' : `❌ DIFF: ${Math.abs(const_total - ward_total).toLocaleString()}`);
  console.log('Counties (synced from const):    ', Number(county_total).toLocaleString(), county_total == const_total ? '✅ MATCH' : `❌ DIFF: ${Math.abs(county_total - const_total).toLocaleString()}`);

  // ── 2. All 47 counties with counts ──────────────────────────
  const counties = await c.query(`
    SELECT 
      co.iebc_code, co.name, co.registered_voters,
      co.constituency_count, co.ward_count, co.polling_station_count,
      -- verify against live aggregation
      (SELECT COUNT(*) FROM nec_constituencies WHERE county_id=co.id AND is_special=false AND active=true) AS live_const_count,
      (SELECT COUNT(*) FROM nec_wards w JOIN nec_constituencies c2 ON c2.id=w.constituency_id WHERE c2.county_id=co.id AND w.is_special=false AND w.active=true) AS live_ward_count,
      (SELECT COUNT(*) FROM nec_polling_stations WHERE county_id=co.id AND is_special=false AND active=true) AS live_ps_count,
      (SELECT SUM(registered_voters) FROM nec_polling_stations WHERE county_id=co.id AND is_special=false AND active=true) AS live_ps_voters
    FROM nec_counties co
    WHERE co.is_special = false
    ORDER BY co.iebc_code::int
  `);

  console.log('\n=== ALL 47 COUNTIES ===');
  console.log(`${'Code'.padEnd(6)}${'County'.padEnd(22)}${'Voters'.padStart(10)}${'Const'.padStart(7)}${'Wards'.padStart(7)}${'PS'.padStart(7)}${'Match?'.padStart(8)}`);
  console.log('─'.repeat(68));
  
  let mismatchCount = 0;
  for (const r of counties.rows) {
    const voterMatch = Number(r.registered_voters) === Number(r.live_ps_voters);
    const constMatch = Number(r.constituency_count) === Number(r.live_const_count);
    const wardMatch  = Number(r.ward_count) === Number(r.live_ward_count);
    const psMatch    = Number(r.polling_station_count) === Number(r.live_ps_count);
    const allMatch   = voterMatch && constMatch && wardMatch && psMatch;
    if (!allMatch) mismatchCount++;
    
    console.log(
      r.iebc_code.padEnd(6) +
      r.name.padEnd(22) +
      String(Number(r.registered_voters).toLocaleString()).padStart(10) +
      String(r.constituency_count).padStart(7) +
      String(r.ward_count).padStart(7) +
      String(r.polling_station_count).padStart(7) +
      (allMatch ? '  ✅' : '  ❌').padStart(8)
    );
    if (!allMatch) {
      if (!voterMatch) console.log(`    ↳ voters: stored=${Number(r.registered_voters).toLocaleString()} live_ps=${Number(r.live_ps_voters).toLocaleString()}`);
      if (!constMatch) console.log(`    ↳ const: stored=${r.constituency_count} live=${r.live_const_count}`);
      if (!wardMatch) console.log(`    ↳ wards: stored=${r.ward_count} live=${r.live_ward_count}`);
      if (!psMatch)   console.log(`    ↳ ps: stored=${r.polling_station_count} live=${r.live_ps_count}`);
    }
  }
  console.log('─'.repeat(68));
  console.log(`Counties with mismatches: ${mismatchCount} / ${counties.rows.length}`);

  // ── 3. Constituency sample — 10 per county of Nairobi (047) ──
  const nairobi = await c.query(`
    SELECT c.iebc_code, c.name, c.registered_voters, c.ward_count, c.polling_station_count,
      (SELECT SUM(w.registered_voters) FROM nec_wards w WHERE w.constituency_id=c.id AND w.is_special=false) AS ward_sum,
      (SELECT SUM(ps.registered_voters) FROM nec_polling_stations ps WHERE ps.constituency_id=c.id AND ps.is_special=false AND ps.active=true) AS ps_sum
    FROM nec_constituencies c
    JOIN nec_counties co ON co.id=c.county_id
    WHERE co.iebc_code='047'
    ORDER BY c.iebc_code
  `);
  console.log('\n=== NAIROBI CONSTITUENCIES (county 047) ===');
  nairobi.rows.forEach(r => {
    const match = Number(r.registered_voters) === Number(r.ps_sum);
    console.log(`  ${r.iebc_code} | ${r.name.padEnd(30)} | voters:${String(Number(r.registered_voters).toLocaleString()).padStart(9)} | wards:${r.ward_count} | ps:${r.polling_station_count} | ps_sum:${String(Number(r.ps_sum).toLocaleString()).padStart(9)} ${match?'✅':'❌'}`);
  });

  // ── 4. Ward sample — Westlands constituency ──────────────────
  const westlands = await c.query(`
    SELECT w.iebc_code, w.name, w.registered_voters, w.polling_station_count, w.registration_centre_count,
      (SELECT SUM(ps.registered_voters) FROM nec_polling_stations ps WHERE ps.ward_id=w.id AND ps.is_special=false AND ps.active=true) AS ps_sum
    FROM nec_wards w
    JOIN nec_constituencies c ON c.id=w.constituency_id
    WHERE c.name ILIKE '%WESTLANDS%'
    ORDER BY w.iebc_code
    LIMIT 10
  `);
  if (westlands.rows.length > 0) {
    console.log('\n=== WESTLANDS WARDS (sample) ===');
    westlands.rows.forEach(r => {
      const match = Number(r.registered_voters) === Number(r.ps_sum);
      console.log(`  Ward ${r.iebc_code} | ${r.name.padEnd(30)} | voters:${String(Number(r.registered_voters).toLocaleString()).padStart(8)} | ps_sum:${String(Number(r.ps_sum).toLocaleString()).padStart(8)} | ps:${r.polling_station_count} | centres:${r.registration_centre_count} ${match?'✅':'❌'}`);
    });
  }

  // ── 5. Views check ─────────────────────────────────────────
  const views = await c.query(`
    SELECT table_name FROM information_schema.views 
    WHERE table_schema='public' AND table_name LIKE 'geography%'
    ORDER BY table_name
  `);
  console.log('\n=== GEOGRAPHY VIEWS ===');
  for (const v of views.rows) {
    const cnt = await c.query(`SELECT COUNT(*) FROM ${v.table_name}`);
    console.log(`  ✅ ${v.table_name}: ${cnt.rows[0].count} rows`);
  }

  // ── 6. Quick sample from view ─────────────────────────────
  const viewSample = await c.query('SELECT * FROM geography_county_summary LIMIT 3');
  console.log('\n=== geography_county_summary sample ===');
  viewSample.rows.forEach(r => console.log(' ', JSON.stringify(r)));

  // ── 7. Grand total reconciliation ─────────────────────────
  console.log('\n=== FINAL RECONCILIATION ===');
  const kenya = await c.query(`
    SELECT 
      (SELECT COUNT(*) FROM nec_counties WHERE is_special=false AND active=true) AS counties,
      (SELECT COUNT(*) FROM nec_constituencies WHERE is_special=false AND active=true) AS constituencies,
      (SELECT COUNT(*) FROM nec_wards WHERE is_special=false AND active=true) AS wards,
      (SELECT COUNT(*) FROM nec_registration_centres WHERE is_special=false AND active=true) AS reg_centres,
      (SELECT COUNT(*) FROM nec_polling_stations WHERE is_special=false AND active=true) AS polling_stations,
      (SELECT SUM(registered_voters) FROM nec_counties WHERE is_special=false AND active=true) AS total_voters
  `);
  const k = kenya.rows[0];
  console.log(`Kenya 2027 General Election — NEC Data:`);
  console.log(`  Counties:           ${k.counties}`);
  console.log(`  Constituencies:     ${k.constituencies}`);
  console.log(`  Wards:              ${k.wards}`);
  console.log(`  Registration Centres: ${k.reg_centres}`);
  console.log(`  Polling Stations:   ${k.polling_stations}`);
  console.log(`  Total Registered Voters: ${Number(k.total_voters).toLocaleString()}`);

  await c.end();
  console.log('\nDone.');
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
