const pg = require('pg');
const DB = { host:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com', port:5432, database:'votecapsule', user:'vcadmin', password:'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0', ssl:{rejectUnauthorized:false}, connectionTimeoutMillis:30000 };
const cl = new pg.Client(DB);
cl.connect().then(async () => {
  const q = (sql, p) => cl.query(sql, p).then(r => r.rows);

  // 1. Campaign budgets with old iebc limits
  console.log('=== CAMPAIGN BUDGETS (current iebc_spending_limit) ===');
  const budgets = await q(`
    SELECT cb.id, cb.iebc_spending_limit, cb.total_allocated, c.name, c.county_code,
           c.constituency_code, c.ward_code, c.goals->>'targetPosition' AS position
    FROM campaign_budgets cb
    JOIN campaigns c ON c.id = cb.campaign_id
    ORDER BY cb.created_at
  `);
  budgets.forEach(b => {
    const lim = Number(b.iebc_spending_limit);
    console.log(`  ${b.name} | pos=${b.position||'?'} | county=${b.county_code||'-'} | const=${b.constituency_code||'-'} | ward=${b.ward_code||'-'} | IEBC_LIMIT=KES ${lim.toLocaleString()}`);
  });

  // 2. iebc_party_limits structure
  console.log('\n=== iebc_party_limits ===');
  const pcols = await q("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='iebc_party_limits' ORDER BY ordinal_position");
  pcols.forEach(c => console.log('  '+c.column_name+' ('+c.data_type+')'));
  const pdata = await q('SELECT * FROM iebc_party_limits LIMIT 3');
  pdata.forEach(r => console.log(' DATA:', JSON.stringify(r)));

  // 3. iebc_presidential_limit structure
  console.log('\n=== iebc_presidential_limit ===');
  const rescols = await q("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='iebc_presidential_limit' ORDER BY ordinal_position");
  rescols.forEach(c => console.log('  '+c.column_name+' ('+c.data_type+')'));
  const presdata = await q('SELECT * FROM iebc_presidential_limit LIMIT 2');
  presdata.forEach(r => console.log(' DATA:', JSON.stringify(r)));

  // 4. Budget categories for a sample campaign
  console.log('\n=== SAMPLE BUDGET CATEGORIES ===');
  const cats = await q(`
    SELECT cbc.category_code, cbc.category_name, cbc.allocated, cbc.spent, c.name AS campaign
    FROM campaign_budget_categories cbc
    JOIN campaigns c ON c.id = cbc.campaign_id
    WHERE c.goals->>'targetPosition' IS NOT NULL
    ORDER BY c.name, cbc.category_code
    LIMIT 30
  `);
  let lastCamp = '';
  cats.forEach(r => {
    if (r.campaign !== lastCamp) { console.log('  Campaign: '+r.campaign); lastCamp = r.campaign; }
    console.log(`    ${r.category_code.padEnd(20)} ${r.category_name.padEnd(40)} alloc=KES ${Number(r.allocated).toLocaleString()}`);
  });

  // 5. What parties exist with party-level campaigns?
  console.log('\n=== PARTY CAMPAIGNS ===');
  const partyCamps = await q(`
    SELECT c.name, c.party_id, c.county_code, c.constituency_code, c.ward_code,
           c.goals->>'targetPosition' AS position
    FROM campaigns c
    WHERE c.party_id IS NOT NULL
    LIMIT 10
  `);
  partyCamps.forEach(r => console.log('  '+r.name+' | party='+r.party_id+' | pos='+r.position));

  // 6. What positions do existing campaigns have?
  console.log('\n=== CAMPAIGN POSITIONS SUMMARY ===');
  const posSum = await q(`
    SELECT goals->>'targetPosition' AS position, COUNT(*) cnt
    FROM campaigns GROUP BY 1 ORDER BY cnt DESC
  `);
  posSum.forEach(r => console.log('  '+r.position+': '+r.cnt));

  await cl.end();
}).catch(e => console.error('ERR:', e.message));
