const pg = require('pg');
const DB = { host:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com', port:5432, database:'votecapsule', user:'vcadmin', password:'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0', ssl:{rejectUnauthorized:false}, connectionTimeoutMillis:30000 };
const cl = new pg.Client(DB);
cl.connect().then(async () => {
  const q = (sql, p) => cl.query(sql, p).then(r => r.rows);

  var cols = await q("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='campaign_budgets' ORDER BY ordinal_position");
  process.stdout.write('campaign_budgets:\n'); cols.forEach(c => process.stdout.write('  '+c.column_name+' '+c.data_type+'\n'));

  var catcols = await q("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='campaign_budget_categories' ORDER BY ordinal_position");
  process.stdout.write('\ncampaign_budget_categories:\n'); catcols.forEach(c => process.stdout.write('  '+c.column_name+' '+c.data_type+'\n'));

  var nec = await q("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'nec%' ORDER BY table_name");
  process.stdout.write('\nNEC tables:\n'); nec.forEach(x => process.stdout.write('  '+x.table_name+'\n'));

  var names = await q('SELECT name, county_code, constituency_code, ward_code, goals FROM campaigns LIMIT 10');
  process.stdout.write('\nSample campaigns:\n');
  names.forEach(x => process.stdout.write('  '+x.name+' c='+x.county_code+' cs='+x.constituency_code+' w='+x.ward_code+' goals='+JSON.stringify(x.goals)+'\n'));

  await cl.end();
}).catch(e => process.stdout.write('ERR:'+e.message+'\n'));
