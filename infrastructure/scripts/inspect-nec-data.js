// inspect-nec-data.js — inspect real NEC geography data in Aurora
const { Client } = require('pg');

const client = new Client({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'votecapsule',
  user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function main() {
  await client.connect();
  console.log('Connected.\n');

  // Row counts
  const [c1,c2,c3,c4,c5] = await Promise.all([
    client.query('SELECT COUNT(*) FROM nec_counties'),
    client.query('SELECT COUNT(*) FROM nec_constituencies'),
    client.query('SELECT COUNT(*) FROM nec_wards'),
    client.query('SELECT COUNT(*) FROM nec_polling_stations'),
    client.query('SELECT COUNT(*) FROM nec_registration_centres'),
  ]);
  console.log('=== ROW COUNTS ===');
  console.log('nec_counties:           ', c1.rows[0].count);
  console.log('nec_constituencies:     ', c2.rows[0].count);
  console.log('nec_wards:              ', c3.rows[0].count);
  console.log('nec_registration_centres:', c5.rows[0].count);
  console.log('nec_polling_stations:   ', c4.rows[0].count);

  // Counties with voter counts
  const cv = await client.query('SELECT COUNT(*) FROM nec_counties WHERE registered_voters > 0');
  const consv = await client.query('SELECT COUNT(*) FROM nec_constituencies WHERE registered_voters > 0');
  const wv = await client.query('SELECT COUNT(*) FROM nec_wards WHERE registered_voters > 0');
  console.log('\n=== REGISTERED VOTERS POPULATION ===');
  console.log('counties with voters > 0:        ', cv.rows[0].count, '/', c1.rows[0].count);
  console.log('constituencies with voters > 0:  ', consv.rows[0].count, '/', c2.rows[0].count);
  console.log('wards with voters > 0:           ', wv.rows[0].count, '/', c3.rows[0].count);

  // Sample counties
  const counties = await client.query(
    'SELECT iebc_code, name, registered_voters FROM nec_counties WHERE is_special=false ORDER BY iebc_code::int LIMIT 10'
  );
  console.log('\n=== SAMPLE COUNTIES (first 10) ===');
  counties.rows.forEach(r => console.log(`  ${r.iebc_code} | ${r.name.padEnd(25)} | voters: ${r.registered_voters}`));

  // Voter totals
  const totals = await client.query(`
    SELECT 
      (SELECT SUM(registered_voters) FROM nec_counties WHERE is_special=false) as county_total,
      (SELECT SUM(registered_voters) FROM nec_constituencies WHERE is_special=false) as const_total,
      (SELECT SUM(registered_voters) FROM nec_wards WHERE is_special=false) as ward_total,
      (SELECT SUM(registered_voters) FROM nec_polling_stations) as ps_total
  `);
  console.log('\n=== VOTER TOTALS ===');
  console.log('Sum from counties:        ', Number(totals.rows[0].county_total).toLocaleString());
  console.log('Sum from constituencies:  ', Number(totals.rows[0].const_total).toLocaleString());
  console.log('Sum from wards:           ', Number(totals.rows[0].ward_total).toLocaleString());
  console.log('Sum from polling stations:', Number(totals.rows[0].ps_total).toLocaleString());

  // Ward columns
  const wcols = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='nec_wards' ORDER BY ordinal_position"
  );
  console.log('\n=== NEC_WARDS COLUMNS ===');
  console.log(wcols.rows.map(r => r.column_name).join(', '));

  // Polling station columns
  const pscols = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='nec_polling_stations' ORDER BY ordinal_position"
  );
  console.log('\n=== NEC_POLLING_STATIONS COLUMNS ===');
  console.log(pscols.rows.map(r => r.column_name).join(', '));

  // Registration centres columns
  const rccols = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='nec_registration_centres' ORDER BY ordinal_position"
  );
  console.log('\n=== NEC_REGISTRATION_CENTRES COLUMNS ===');
  console.log(rccols.rows.map(r => r.column_name).join(', '));

  // nec_registration_centres uses ward_id FK (not ward_code)
  const wardps = await client.query(`
    SELECT 
      w.iebc_code AS ward_code,
      w.name AS ward_name,
      w.registered_voters AS ward_stored_voters,
      COUNT(DISTINCT rc.id) AS reg_centres,
      COUNT(ps.id) AS polling_stations,
      COALESCE(SUM(ps.registered_voters), 0) AS ps_voter_sum
    FROM nec_wards w
    LEFT JOIN nec_registration_centres rc ON rc.ward_id = w.id
    LEFT JOIN nec_polling_stations ps ON ps.registration_centre_id = rc.id
    WHERE w.is_special = false
    GROUP BY w.id, w.iebc_code, w.name, w.registered_voters
    ORDER BY w.id
    LIMIT 8
  `);
  console.log('\n=== SAMPLE WARD ↔ POLLING STATION LINKAGE (ward_id FK) ===');
  wardps.rows.forEach(r => {
    console.log(`  Ward ${r.ward_code} | ${r.ward_name.padEnd(30)} | stored:${r.ward_stored_voters} | ps_sum:${r.ps_voter_sum} | ps:${r.polling_stations} | centres:${r.reg_centres}`);
  });

  // Sample RC row
  const rcrow = await client.query('SELECT * FROM nec_registration_centres LIMIT 1');
  if (rcrow.rows.length > 0) console.log('\nSample RC:', JSON.stringify(rcrow.rows[0]));

  // Sample PS row  
  const psrow = await client.query('SELECT * FROM nec_polling_stations LIMIT 1');
  if (psrow.rows.length > 0) console.log('Sample PS:', JSON.stringify(psrow.rows[0]));

  // County aggregation
  const countyagg = await client.query(`
    SELECT 
      co.iebc_code AS county_code,
      co.name AS county_name,
      co.registered_voters AS stored_voters,
      COUNT(DISTINCT nc.id) AS constituency_count,
      COUNT(DISTINCT w.id) AS ward_count,
      SUM(nc.registered_voters) AS sum_from_constituencies,
      COALESCE((
        SELECT SUM(ps.registered_voters) 
        FROM nec_polling_stations ps 
        WHERE ps.county_id = co.id
      ), 0) AS ps_voter_sum
    FROM nec_counties co
    LEFT JOIN nec_constituencies nc ON nc.county_id = co.id
    LEFT JOIN nec_wards w ON w.constituency_id = nc.id
    WHERE co.is_special = false
    GROUP BY co.id, co.iebc_code, co.name, co.registered_voters
    ORDER BY co.iebc_code::int
    LIMIT 10
  `);
  console.log('\n=== COUNTY AGGREGATION (first 10) ===');
  countyagg.rows.forEach(r => {
    console.log(`  ${r.county_code} | ${r.county_name.padEnd(20)} | stored:${String(r.stored_voters).padStart(7)} | const:${r.constituency_count} | wards:${r.ward_count} | sum_const:${r.sum_from_constituencies} | ps_sum:${r.ps_voter_sum}`);
  });

  // Check: do polling stations have county_id populated?
  const psCountyCheck = await client.query('SELECT COUNT(*) FROM nec_polling_stations WHERE county_id IS NOT NULL');
  const psWardCheck = await client.query('SELECT COUNT(*) FROM nec_polling_stations WHERE ward_id IS NOT NULL');
  const psConstCheck = await client.query('SELECT COUNT(*) FROM nec_polling_stations WHERE constituency_id IS NOT NULL');
  console.log('\n=== POLLING STATION FK POPULATION ===');
  console.log('ps with county_id:       ', psCountyCheck.rows[0].count, '/ 45805');
  console.log('ps with ward_id:         ', psWardCheck.rows[0].count, '/ 45805');
  console.log('ps with constituency_id: ', psConstCheck.rows[0].count, '/ 45805');

  await client.end();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
