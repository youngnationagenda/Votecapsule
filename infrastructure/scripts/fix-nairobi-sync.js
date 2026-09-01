// fix-nairobi-sync.js — diagnose and fix Nairobi PS ↔ ward alignment
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

  // Find the 3 problem constituencies
  const probs = [283, 284, 286]; // Embakasi North, Central, West

  for (const constCode of probs) {
    console.log(`\n=== Constituency ${constCode} ===`);

    // Get the constituency internal id
    const constRow = await c.query(
      'SELECT id, name, registered_voters FROM nec_constituencies WHERE iebc_code=$1',
      [String(constCode)]
    );
    if (!constRow.rows.length) { console.log('Not found'); continue; }
    const { id: constId, name: constName, registered_voters } = constRow.rows[0];
    console.log(`Name: ${constName} | stored_voters: ${registered_voters}`);

    // Get wards in this constituency
    const wards = await c.query(
      'SELECT id, iebc_code, name, registered_voters FROM nec_wards WHERE constituency_id=$1 AND is_special=false',
      [constId]
    );
    console.log(`Wards (${wards.rows.length}):`);
    let wardVoterSum = 0;
    for (const w of wards.rows) {
      // Count PS via ward_id FK
      const psByWardId = await c.query(
        'SELECT COUNT(*) as cnt, COALESCE(SUM(registered_voters),0) as voters FROM nec_polling_stations WHERE ward_id=$1 AND is_special=false AND active=true',
        [w.id]
      );
      // Count PS via constituency_id FK (different?)
      const psByConst = await c.query(
        'SELECT COUNT(*) as cnt, COALESCE(SUM(registered_voters),0) as voters FROM nec_polling_stations WHERE constituency_id=$1 AND ward_id=$2 AND is_special=false AND active=true',
        [constId, w.id]
      );
      const byWard = psByWardId.rows[0];
      const byConst = psByConst.rows[0];
      wardVoterSum += Number(byWard.voters);
      console.log(`  Ward ${w.iebc_code} ${w.name.padEnd(25)} stored:${w.registered_voters} | ps_by_ward_id: cnt=${byWard.cnt} voters=${byWard.voters} | ps_by_both: cnt=${byConst.cnt} voters=${byConst.voters}`);
    }
    console.log(`Ward voter sum: ${wardVoterSum} vs stored constituency: ${registered_voters}`);

    // Check if any PS in this constituency have ward_id pointing OUTSIDE constituency
    const mismatch = await c.query(`
      SELECT ps.id, ps.name, ps.registered_voters, ps.ward_id, ps.constituency_id, w.constituency_id AS w_const_id
      FROM nec_polling_stations ps
      JOIN nec_wards w ON w.id = ps.ward_id
      WHERE ps.constituency_id = $1
        AND w.constituency_id != $1
        AND ps.is_special = false AND ps.active = true
      LIMIT 10
    `, [constId]);
    if (mismatch.rows.length > 0) {
      console.log(`\n  ⚠️  ${mismatch.rows.length} PS where ps.constituency_id=${constCode} but ward.constituency_id≠${constCode}:`);
      mismatch.rows.forEach(r => console.log(`    PS id=${r.id} name=${r.name.slice(0,30)} voters=${r.registered_voters} ward_id=${r.ward_id} w_const=${r.w_const_id}`));
    }

    // Check reverse: PS with ward in THIS constituency but ps.constituency_id = other
    const orphan = await c.query(`
      SELECT ps.id, ps.name, ps.registered_voters, ps.ward_id, ps.constituency_id
      FROM nec_polling_stations ps
      JOIN nec_wards w ON w.id = ps.ward_id AND w.constituency_id = $1
      WHERE ps.constituency_id != $1
        AND ps.is_special = false AND ps.active = true
      LIMIT 10
    `, [constId]);
    if (orphan.rows.length > 0) {
      console.log(`\n  ⚠️  ${orphan.rows.length} PS where ward.constituency=${constCode} but ps.constituency_id≠${constCode}:`);
      orphan.rows.forEach(r => console.log(`    PS id=${r.id} voters=${r.registered_voters} ps_const_id=${r.constituency_id}`));
    }

    // Total PS voters where ward IS in this constituency
    const correctTotal = await c.query(`
      SELECT COALESCE(SUM(ps.registered_voters),0) AS total
      FROM nec_polling_stations ps
      JOIN nec_wards w ON w.id = ps.ward_id AND w.constituency_id = $1
      WHERE ps.is_special = false AND ps.active = true
    `, [constId]);
    console.log(`\n  Correct total (via ward.constituency_id): ${correctTotal.rows[0].total}`);
    console.log(`  Stored constituency voters:               ${registered_voters}`);
  }

  // Global: are there ANY PS where ward and constituency FKs disagree?
  const globalMismatch = await c.query(`
    SELECT COUNT(*) AS cnt
    FROM nec_polling_stations ps
    JOIN nec_wards w ON w.id = ps.ward_id
    WHERE ps.constituency_id != w.constituency_id
      AND ps.is_special = false AND ps.active = true
  `);
  console.log(`\n=== GLOBAL: PS where ps.constituency_id ≠ ward.constituency_id ===`);
  console.log(`Count: ${globalMismatch.rows[0].cnt}`);

  // Global: PS without a valid ward
  const noWard = await c.query(
    'SELECT COUNT(*) FROM nec_polling_stations WHERE ward_id IS NULL AND is_special=false AND active=true'
  );
  console.log(`PS without ward_id: ${noWard.rows[0].count}`);

  await c.end();
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
