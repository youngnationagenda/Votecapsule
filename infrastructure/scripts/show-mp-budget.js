const pg = require('pg');
const DB = { host:'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com', port:5432, database:'votecapsule', user:'vcadmin', password:'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0', ssl:{rejectUnauthorized:false}, connectionTimeoutMillis:30000 };
const cl = new pg.Client(DB);
cl.connect().then(async () => {
  const r = await cl.query(`
    SELECT cbc.category_code, cbc.allocated, cbc.iebc_gazette_amount, cbc.iebc_share_pct
    FROM campaign_budget_categories cbc
    JOIN campaign_budgets cb ON cb.id=cbc.budget_id
    WHERE cb.position='MP' ORDER BY cbc.iebc_gazette_amount DESC
  `);
  const limit = 17805609;
  console.log('MP (Kasarani const 270) Budget Categories:');
  console.log('IEBC Limit: KES ' + limit.toLocaleString());
  console.log('');
  r.rows.forEach(x => {
    const correct = Math.round(limit * (Number(x.iebc_share_pct) / 100));
    const userSet = Number(x.allocated) !== correct && Number(x.allocated) > 0;
    const flag = userSet ? ' ← user-set value (preserved)' : '';
    console.log(
      x.category_code.padEnd(20) +
      ' allocated=KES ' + Number(x.allocated).toLocaleString().padEnd(15) +
      ' gazette_correct=KES ' + correct.toLocaleString().padEnd(12) +
      ' gazette_max=KES ' + Number(x.iebc_gazette_amount).toLocaleString() +
      flag
    );
  });
  await cl.end();
}).catch(e => console.error('ERR:', e.message));
