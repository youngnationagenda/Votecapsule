const { Client } = require('pg');
const client = new Client({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 30000,
});
async function main() {
  await client.connect();
  // tenants columns
  const r1 = await client.query(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='tenants' ORDER BY ordinal_position"
  );
  console.log('tenants columns:');
  r1.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`));
  // existing tenants
  const r2 = await client.query('SELECT id, name, slug, type, status FROM tenants LIMIT 5');
  console.log('\nExisting tenants:', r2.rows.length ? JSON.stringify(r2.rows, null, 2) : 'none');
  await client.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
