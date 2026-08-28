#!/usr/bin/env node
// Check schema for SMS audience resolution
const { Pool } = require('pg');
const pool = new Pool({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
});
async function main() {
  const client = await pool.connect();

  // Volunteers columns
  const vols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='campaign_volunteers' ORDER BY ordinal_position`);
  console.log('\ncampaign_volunteers columns:');
  vols.rows.forEach(r => console.log(' ', r.column_name, '('+r.data_type+')'));

  // Team members columns
  const tm = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='campaign_team_members' ORDER BY ordinal_position`);
  console.log('\ncampaign_team_members columns:');
  tm.rows.forEach(r => console.log(' ', r.column_name, '('+r.data_type+')'));

  // SMS consents table
  try {
    const cs = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='campaign_sms_consents' ORDER BY ordinal_position`);
    console.log('\ncampaign_sms_consents columns:');
    cs.rows.forEach(r => console.log(' ', r.column_name, '('+r.data_type+')'));
  } catch(e) {
    console.log('\ncampaign_sms_consents: NOT FOUND');
  }

  // SMS batches — check audience_filter column
  const sb = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='campaign_sms_batches' AND column_name IN ('audience_filter','recipient_type','target_roles','target_wards') ORDER BY ordinal_position`);
  console.log('\ncampaign_sms_batches audience cols:');
  if (sb.rows.length) sb.rows.forEach(r => console.log(' ', r.column_name, '('+r.data_type+')'));
  else console.log(' (none of audience_filter/recipient_type/target_roles/target_wards found)');

  // SMS messages — check phone number col
  const sm = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='campaign_sms_messages' ORDER BY ordinal_position`);
  console.log('\ncampaign_sms_messages columns:');
  sm.rows.forEach(r => console.log(' ', r.column_name, '('+r.data_type+')'));

  client.release();
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
