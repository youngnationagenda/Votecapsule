const pg = require('pg');
const DB = { host:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com', port:5432, database:'votecapsule', user:'vcadmin', password:'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0', ssl:{rejectUnauthorized:false}, connectionTimeoutMillis:30000 };
const c = new pg.Client(DB);
c.connect().then(async () => {
  const q = (sql) => c.query(sql).then(r => r.rows);
  const r1 = await q('SELECT COUNT(*) FROM iebc_ward_limits WHERE election_year=2027');
  console.log('ward_limits:', r1[0].count);
  
  const r2 = await q('SELECT ward_code, ward_name, county_code, registered_voters, mca_spending_limit FROM iebc_ward_limits WHERE election_year=2027 ORDER BY mca_spending_limit DESC LIMIT 5');
  r2.forEach(r => console.log(' ', r.ward_code, r.ward_name.padEnd(30), 'voters:', r.registered_voters, 'MCA: KES', Number(r.mca_spending_limit).toLocaleString()));

  const r3 = await q('SELECT county_code, county_name, governor_limit, senator_limit, women_rep_limit FROM iebc_county_limits ORDER BY governor_limit DESC LIMIT 15');
  console.log('\nCounty limits (sorted by governor):');
  r3.forEach(r => console.log(' ', r.county_code, r.county_name.padEnd(22), 'GOV:', Number(r.governor_limit).toLocaleString(), '| SEN:', Number(r.senator_limit).toLocaleString(), '| WR:', Number(r.women_rep_limit).toLocaleString()));
  
  await c.end();
}).catch(e => { console.log('ERR:', e.message); c.end(); });
