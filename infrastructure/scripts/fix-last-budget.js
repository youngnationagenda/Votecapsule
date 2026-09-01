const pg = require('pg');
const DB = { host:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com', port:5432, database:'votecapsule', user:'vcadmin', password:'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0', ssl:{rejectUnauthorized:false}, connectionTimeoutMillis:30000 };
const IEBC_CATS = [
  { code: 'venues',          name: 'Venues for Campaign Rallies',   share: 1.5,  gazetteKes:    375052688 },
  { code: 'publicity',       name: 'Publicity Materials',           share: 4.4,  gazetteKes:   1066714464 },
  { code: 'advertising',     name: 'Advertising & Media',           share: 10.3, gazetteKes:   2517509489 },
  { code: 'personnel',       name: 'Campaign Personnel',            share: 1.4,  gazetteKes:    332922614 },
  { code: 'agents',          name: 'Election Agents',               share: 8.5,  gazetteKes:   2081162296 },
  { code: 'transport',       name: 'Transportation',                share: 66.0, gazetteKes:  16126632035 },
  { code: 'communication',   name: 'Communication & Telephone',     share: 0.5,  gazetteKes:    134230217 },
  { code: 'nomination_fees', name: 'Nomination Fees',               share: 0.9,  gazetteKes:    213818044 },
  { code: 'security',        name: 'Security',                      share: 1.2,  gazetteKes:    285090725 },
  { code: 'accommodation',   name: 'Accommodation & Travel',        share: 0.1,  gazetteKes:     24945438 },
  { code: 'administrative',  name: 'Administrative Cost',           share: 5.3,  gazetteKes:   1292094521 },
];

const cl = new pg.Client(DB);
cl.connect().then(async () => {
  const q = (sql,p) => cl.query(sql,p).then(r=>r.rows);
  // Find budget not having all 11 IEBC cats
  const incomplete = await q(`
    SELECT cb.id, cb.campaign_id, cb.tenant_id, cb.position, cb.iebc_spending_limit, c.name
    FROM campaign_budgets cb JOIN campaigns c ON c.id=cb.campaign_id
    WHERE (SELECT COUNT(*) FROM campaign_budget_categories WHERE budget_id=cb.id) != 11
  `);
  process.stdout.write('Incomplete budgets: '+incomplete.length+'\n');
  
  for (const bud of incomplete) {
    process.stdout.write('  Fixing: '+bud.name+' pos='+bud.position+' limit='+bud.iebc_spending_limit+'\n');
    // Delete old non-IEBC categories
    const oldCodes = IEBC_CATS.map(c => c.code);
    await cl.query(
      `DELETE FROM campaign_budget_categories WHERE budget_id=$1 AND category_code NOT IN (${oldCodes.map((_,i)=>'$'+(i+2)).join(',')})`,
      [bud.id, ...oldCodes]
    );
    // Seed all 11 IEBC categories
    const pos = bud.position || 'MP';
    const limit = Number(bud.iebc_spending_limit);
    for (const cat of IEBC_CATS) {
      const allocated = pos === 'PARTY' ? cat.gazetteKes : Math.round(limit * (cat.share / 100));
      await cl.query(
        `INSERT INTO campaign_budget_categories (budget_id, campaign_id, tenant_id, category_code, category_name, allocated, committed, spent, iebc_gazette_amount, iebc_share_pct)
         VALUES ($1,$2,$3,$4,$5,$6,0,0,$7,$8)
         ON CONFLICT (budget_id, category_code)
         DO UPDATE SET category_name=EXCLUDED.category_name, iebc_gazette_amount=EXCLUDED.iebc_gazette_amount, iebc_share_pct=EXCLUDED.iebc_share_pct,
           allocated=CASE WHEN campaign_budget_categories.allocated=0 THEN EXCLUDED.allocated ELSE campaign_budget_categories.allocated END, updated_at=NOW()`,
        [bud.id, bud.campaign_id, bud.tenant_id, cat.code, cat.name, allocated, cat.gazetteKes, cat.share]
      );
    }
    // Sync total
    await cl.query('UPDATE campaign_budgets SET total_allocated=(SELECT COALESCE(SUM(allocated),0) FROM campaign_budget_categories WHERE budget_id=$1),updated_at=NOW() WHERE id=$1',[bud.id]);
  }

  // Final count
  const done = await q('SELECT COUNT(*) cnt FROM campaign_budgets cb WHERE (SELECT COUNT(*) FROM campaign_budget_categories WHERE budget_id=cb.id)=11');
  const total = await q('SELECT COUNT(*) cnt FROM campaign_budgets');
  process.stdout.write('Complete budgets: '+done[0].cnt+'/'+total[0].cnt+'\n');

  // Show sample MP budget categories
  const mp = await q(`SELECT cbc.category_code, cbc.category_name, cbc.allocated, cbc.iebc_gazette_amount, cbc.iebc_share_pct FROM campaign_budget_categories cbc JOIN campaign_budgets cb ON cb.id=cbc.budget_id WHERE cb.position='MP' ORDER BY cbc.iebc_gazette_amount DESC`);
  process.stdout.write('\nMP (Kasarani) budget categories:\n');
  mp.forEach(r => process.stdout.write('  '+r.category_code.padEnd(20)+r.category_name.padEnd(40)+'alloc=KES '+Number(r.allocated).toLocaleString()+' gazette_max=KES '+Number(r.iebc_gazette_amount).toLocaleString()+' share='+r.iebc_share_pct+'%\n'));

  await cl.end();
  process.stdout.write('\n✅ All budgets complete!\n');
}).catch(e => { process.stdout.write('ERR:'+e.message+'\n'); });
