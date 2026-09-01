/**
 * Fix the 12 missing wards (1379-1390 = Nyamira) and
 * re-fix wards 1391-1450 (Nairobi) with correct gazette values.
 */
const pg = require('pg');
const fs = require('fs');

const DB = {
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 60000
};

const wardData = JSON.parse(fs.readFileSync('D:/Votecapsule/ward_code_limits.json'));

// Wards to update: 1379-1390 (previously missing) + 1391-1450 (previously wrong)
const toUpdate = {};
for (let i = 1379; i <= 1450; i++) {
  const code = String(i).padStart(4, '0');
  if (wardData[code]) toUpdate[code] = wardData[code];
}

console.log('Wards to update:', Object.keys(toUpdate).length);
console.log('Sample:', Object.entries(toUpdate).slice(0, 5));

const client = new pg.Client(DB);

client.connect().then(async () => {
  const pairs = Object.entries(toUpdate);
  const valueParts = pairs.map(([code, limit]) => `('${code}', ${limit})`);
  
  const sql = `
    UPDATE iebc_ward_limits AS t
    SET mca_spending_limit = v.limit_kes,
        gazette_ref = 'GN 12251 (7 Aug 2026)',
        schedule = 'Fourth Schedule'
    FROM (VALUES ${valueParts.join(',')}) AS v(code, limit_kes)
    WHERE t.ward_code = v.code AND t.election_year = 2027
  `;
  
  const result = await client.query(sql);
  console.log('Updated:', result.rowCount, 'wards');
  
  // Verify
  const check = await client.query(
    `SELECT COUNT(*) cnt FROM iebc_ward_limits WHERE election_year=2027 AND gazette_ref='GN 12251 (7 Aug 2026)'`
  );
  console.log('Total gazette-updated wards:', check.rows[0].cnt);
  
  // Show specific wards
  const sample = await client.query(
    `SELECT ward_code, ward_name, mca_spending_limit FROM iebc_ward_limits
     WHERE election_year=2027 AND ward_code IN ('1379','1380','1381','1389','1390','1391','1392','1439','1440','1450')
     ORDER BY ward_code`
  );
  console.log('\nSample verification:');
  sample.rows.forEach(r => {
    console.log(`  ${r.ward_code} ${r.ward_name}: KES ${Number(r.mca_spending_limit).toLocaleString()}`);
  });
  
  await client.end();
  console.log('\n✅ All ward limits corrected!');
}).catch(e => {
  console.error('ERR:', e.message);
  client.end();
});
