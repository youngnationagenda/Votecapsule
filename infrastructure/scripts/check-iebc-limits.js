const pg = require('pg');
const DB = {
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 30000,
};
const c = new pg.Client(DB);
c.connect().then(async () => {
  const q = async (sql, params) => { const r = await c.query(sql, params); return r.rows; };

  console.log('=== IEBC LIMIT TABLES ===');
  console.log('county_limits:', (await q('SELECT COUNT(*) FROM iebc_county_limits'))[0].count);
  const cs = await q('SELECT county_code,county_name,governor_limit,senator_limit,women_rep_limit FROM iebc_county_limits ORDER BY county_code LIMIT 5');
  cs.forEach(r => console.log(' ', r.county_code, r.county_name.padEnd(20), 'GOV:', Number(r.governor_limit).toLocaleString(), 'SEN:', Number(r.senator_limit).toLocaleString()));

  console.log('\nconstituency_limits (2027):', (await q('SELECT COUNT(*) FROM iebc_constituency_limits WHERE election_year=2027'))[0].count);
  const consl = await q('SELECT constituency_code,constituency_name,county_code,population,spending_limit_kes FROM iebc_constituency_limits WHERE election_year=2027 ORDER BY spending_limit_kes DESC LIMIT 5');
  consl.forEach(r => console.log(' ', r.constituency_code, r.constituency_name.padEnd(30), 'pop:', r.population, 'limit: KES', Number(r.spending_limit_kes).toLocaleString()));

  const pres = await q('SELECT spending_limit_kes,schedule,gazette_ref FROM iebc_presidential_limit LIMIT 1');
  console.log('\npresidential_limit:', pres[0]);

  const party = await q('SELECT total_limit_kes,election_year FROM iebc_party_limits WHERE election_year=2027');
  console.log('party_limit (2027):', party[0]);

  // Budget table columns
  const bcols = await q("SELECT column_name FROM information_schema.columns WHERE table_name='campaign_budgets' ORDER BY ordinal_position");
  console.log('\ncampaign_budgets cols:', bcols.map(r=>r.column_name).join(', '));

  // Campaign table columns - especially goals/position fields
  const ccols = await q("SELECT column_name FROM information_schema.columns WHERE table_name='campaigns' ORDER BY ordinal_position");
  console.log('campaigns cols:', ccols.map(r=>r.column_name).join(', '));

  // Sample campaign with goals
  const samp = await q("SELECT id, name, county_code, constituency_code, ward_code, goals FROM campaigns WHERE goals != '{}' LIMIT 3");
  samp.forEach(r => console.log('\nSample campaign:', r.name, '| goals:', JSON.stringify(r.goals), '| county:', r.county_code, '| const:', r.constituency_code));

  await c.end();
}).catch(e => { console.log('ERR:', e.message); c.end(); });
