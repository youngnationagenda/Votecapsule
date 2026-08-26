#!/usr/bin/env node
/**
 * Verify campaign roles are seeded in the roles table
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();

  // Check campaign-specific roles in the roles table
  const roles = await client.query(
    `SELECT name, description FROM roles WHERE name LIKE 'CAMPAIGN%' OR name LIKE 'WARD%' OR name LIKE 'CANDIDATE%' OR name LIKE 'BRAND%' OR name LIKE 'FINANCE%' OR name LIKE 'LOGISTICS%' OR name LIKE 'COMMUNICATIONS%' OR name LIKE 'PARTY_CAMPAIGN%' ORDER BY name`
  );
  console.log(`\nCampaign roles in DB (${roles.rows.length} found):`);
  roles.rows.forEach(r => console.log(`  - ${r.name}: ${r.description || '(no desc)'}`));

  // Check permissions
  const perms = await client.query(
    `SELECT COUNT(*) as c FROM permissions WHERE resource LIKE 'campaign%'`
  );
  console.log(`\nCampaign permissions in DB: ${perms.rows[0].c}`);

  // Check schema_migrations for 138-142
  const migs = await client.query(
    `SELECT filename, ran_at FROM schema_migrations WHERE filename >= '138' ORDER BY filename`
  );
  console.log('\nMigrations 138-142 status:');
  migs.rows.forEach(r => console.log(`  - ${r.filename} (ran: ${r.ran_at || 'unknown'})`));

  // Check campaign_team_members table structure
  const cols = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'campaign_team_members' ORDER BY ordinal_position`
  );
  console.log('\ncampaign_team_members columns:');
  cols.rows.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));

  client.release();
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
