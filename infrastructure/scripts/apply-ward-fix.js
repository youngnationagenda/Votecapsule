// apply-ward-fix.js — directly fix the 3 orphan wards and re-sync
const { Client } = require('pg');
const DB_CONFIG = {
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 30000,
};
async function main() {
  const c = new Client(DB_CONFIG);
  await c.connect();
  console.log('Connected.\n');

  // Find the 3 problem wards by iebc_code
  const wards = await c.query(
    "SELECT id, iebc_code, name, registered_voters FROM nec_wards WHERE iebc_code IN ('1412','1416','1426') ORDER BY iebc_code"
  );
  console.log('Orphan wards found:');
  wards.rows.forEach(r => console.log(`  id=${r.id} code=${r.iebc_code} name="${r.name}" voters=${r.registered_voters}`));

  // Ward voter corrections from original NEC data
  const corrections = {
    '1412': 20543,
    '1416': 25563,
    '1426': 40554,
  };

  for (const ward of wards.rows) {
    const targetVoters = corrections[ward.iebc_code];
    if (!targetVoters) { console.log(`No correction for ${ward.iebc_code}`); continue; }
    
    const r = await c.query(
      'UPDATE nec_wards SET registered_voters=$1, updated_at=NOW() WHERE id=$2 RETURNING id, name, registered_voters',
      [targetVoters, ward.id]
    );
    console.log(`  Updated ward ${ward.iebc_code} "${ward.name}" → ${r.rows[0].registered_voters}`);
  }

  // Re-sync constituencies 283, 284, 286
  for (const constCode of ['283', '284', '286']) {
    const constRow = await c.query('SELECT id, name FROM nec_constituencies WHERE iebc_code=$1', [constCode]);
    if (!constRow.rows.length) { console.log(`Const ${constCode} not found`); continue; }
    const { id: constId, name: constName } = constRow.rows[0];

    const wardSum = await c.query(
      'SELECT COALESCE(SUM(registered_voters),0) AS total FROM nec_wards WHERE constituency_id=$1 AND is_special=false AND active=true',
      [constId]
    );
    const total = Number(wardSum.rows[0].total);

    await c.query(
      'UPDATE nec_constituencies SET registered_voters=$1, updated_at=NOW() WHERE id=$2',
      [total, constId]
    );
    console.log(`  Const ${constCode} ${constName} → ${total.toLocaleString()}`);
  }

  // Re-sync Nairobi county
  const nairobiRow = await c.query('SELECT id FROM nec_counties WHERE iebc_code=$1', ['047']);
  const nairobiId = nairobiRow.rows[0].id;
  
  const constTotal = await c.query(
    'SELECT COALESCE(SUM(registered_voters),0) AS total FROM nec_constituencies WHERE county_id=$1 AND is_special=false AND active=true',
    [nairobiId]
  );
  const nairobiTotal = Number(constTotal.rows[0].total);
  await c.query('UPDATE nec_counties SET registered_voters=$1, updated_at=NOW() WHERE id=$2', [nairobiTotal, nairobiId]);
  console.log(`\nNairobi county updated → ${nairobiTotal.toLocaleString()}`);

  // Verify
  const verify = await c.query(`
    SELECT 
      (SELECT SUM(registered_voters) FROM nec_counties WHERE is_special=false AND active=true) AS county_total,
      (SELECT SUM(registered_voters) FROM nec_constituencies WHERE is_special=false AND active=true) AS const_total,
      (SELECT SUM(registered_voters) FROM nec_wards WHERE is_special=false AND active=true) AS ward_total,
      (SELECT SUM(registered_voters) FROM nec_polling_stations WHERE is_special=false AND active=true) AS ps_total
  `);
  const { county_total, const_total, ward_total, ps_total } = verify.rows[0];
  console.log('\n=== FINAL VERIFICATION ===');
  console.log('Polling stations (ground truth):', Number(ps_total).toLocaleString());
  console.log('Wards:                          ', Number(ward_total).toLocaleString(), Number(ward_total) === Number(ps_total) ? '✅ EXACT MATCH' : `⚠️  diff=${Math.abs(ward_total - ps_total).toLocaleString()} (3 wards w/ no PS records)`);
  console.log('Constituencies:                 ', Number(const_total).toLocaleString(), Number(const_total) === Number(ward_total) ? '✅ MATCH' : '❌');
  console.log('Counties:                       ', Number(county_total).toLocaleString(), Number(county_total) === Number(const_total) ? '✅ MATCH' : '❌');

  // Show Nairobi all constituencies
  const nairobi = await c.query(`
    SELECT c.iebc_code, c.name, c.registered_voters,
      (SELECT SUM(ps.registered_voters) FROM nec_polling_stations ps WHERE ps.constituency_id=c.id AND ps.is_special=false AND ps.active=true) AS ps_sum
    FROM nec_constituencies c
    JOIN nec_counties co ON co.id=c.county_id
    WHERE co.iebc_code='047'
    ORDER BY c.iebc_code
  `);
  console.log('\n=== NAIROBI CONSTITUENCIES ===');
  let nairobiWardSum = 0;
  for (const r of nairobi.rows) {
    nairobiWardSum += Number(r.registered_voters);
    const match = Number(r.registered_voters) === Number(r.ps_sum);
    const icon = match ? '✅' : '⚠️ ';
    console.log(`  ${r.iebc_code} | ${r.name.padEnd(30)} | ${String(Number(r.registered_voters).toLocaleString()).padStart(9)} ${icon}`);
  }
  console.log(`  TOTAL: ${nairobiWardSum.toLocaleString()} | county stored: ${nairobiTotal.toLocaleString()} ${nairobiWardSum === nairobiTotal ? '✅' : '❌'}`);

  await c.end();
  console.log('\nDone.');
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
