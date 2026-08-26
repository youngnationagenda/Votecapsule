const { Client } = require('pg');
const c = new Client({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
});
async function verify() {
  await c.connect();
  const r1  = await c.query('SELECT COUNT(*) FROM campaign_material_types');
  const r2  = await c.query('SELECT COUNT(*) FROM campaign_material_categories');
  const r3  = await c.query('SELECT COUNT(*) FROM campaign_suppliers');
  const r4  = await c.query("SELECT name FROM roles WHERE name LIKE 'CAMPAIGN%' OR name LIKE '%COORDINATOR%' OR name LIKE '%DIRECTOR%' OR name LIKE '%VOLUNTEER%'");
  const r5  = await c.query('SELECT COUNT(*) FROM campaign_sms_messages');
  const r6  = await c.query('SELECT COUNT(*) FROM campaign_supplier_products');
  const r7  = await c.query("SELECT filename FROM schema_migrations WHERE id > 163 ORDER BY id");
  const r8  = await c.query("SELECT company_name, website FROM campaign_suppliers LIMIT 5");
  const r9  = await c.query("SELECT image_url FROM campaign_supplier_products LIMIT 2");
  const r10 = await c.query("SELECT COUNT(*) FROM campaign_supplier_products WHERE image_url LIKE '%me-advertising%'");
  const r11 = await c.query("SELECT COUNT(*) FROM campaign_supplier_products WHERE image_url NOT LIKE '%me-advertising%' AND image_url IS NOT NULL");

  console.log('material_types:',    r1.rows[0].count);
  console.log('categories:',        r2.rows[0].count);
  console.log('suppliers:',         r3.rows[0].count);
  console.log('campaign_roles:',    r4.rows.map(x => x.name).join(', '));
  console.log('sms_messages:',      r5.rows[0].count);
  console.log('supplier_products:', r6.rows[0].count);
  console.log('migrations 164+:',   r7.rows.map(x => x.filename).join(', '));
  console.log('suppliers:',         r8.rows.map(x => `${x.company_name} → ${x.website}`).join('\n  '));
  console.log('sample image_url:',  r9.rows.map(x => x.image_url).join('\n  '));
  console.log('me-advertising URLs:', r10.rows[0].count);
  console.log('non-me-advertising URLs (should be 0):', r11.rows[0].count);
  await c.end();
}
verify().catch(e => { console.error(e.message); process.exit(1); });
