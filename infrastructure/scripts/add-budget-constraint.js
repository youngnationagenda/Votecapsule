const pg = require('pg');
const DB = { host:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com', port:5432, database:'votecapsule', user:'vcadmin', password:'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0', ssl:{rejectUnauthorized:false}, connectionTimeoutMillis:30000 };
const cl = new pg.Client(DB);
cl.connect().then(async () => {
  // Show existing indexes
  var idx = await cl.query("SELECT indexname,indexdef FROM pg_indexes WHERE tablename='campaign_budget_categories'");
  idx.rows.forEach(r => process.stdout.write(r.indexname+': '+r.indexdef+'\n'));
  // Create unique constraint
  await cl.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_bcat_campaign_code ON campaign_budget_categories (campaign_id, category_code)');
  process.stdout.write('Unique index created\n');
  await cl.end();
}).catch(e => process.stdout.write('ERR:'+e.message+'\n'));
