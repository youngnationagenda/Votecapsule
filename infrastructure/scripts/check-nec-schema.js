const { Client } = require('pg');
const client = new Client({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 30000,
});
async function main() {
  await client.connect();

  for (const tbl of ['nec_counties','nec_constituencies','nec_wards','candidate_election_positions']) {
    const r = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position", [tbl]
    );
    console.log(`\n${tbl} columns:`);
    r.rows.forEach(row => console.log('  ', row.column_name));
  }

  // Sample a constituency row to see actual data
  const s = await client.query('SELECT * FROM nec_constituencies LIMIT 1');
  console.log('\nSample nec_constituencies row:', JSON.stringify(s.rows[0], null, 2));

  await client.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
