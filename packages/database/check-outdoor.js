const { Client } = require('pg');
const c = new Client({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
});
async function run() {
  await c.connect();

  // Check outdoor materials in campaign_material_types
  const r1 = await c.query(`
    SELECT mt.code, mt.name, mt.typical_cost_min, mt.thumbnail_url, sp.image_url, sp.unit_price
    FROM campaign_material_types mt
    JOIN campaign_material_categories mc ON mc.id = mt.category_id
    LEFT JOIN campaign_supplier_products sp ON sp.material_type_id = mt.id
    WHERE mc.code = 'OUTDOOR_ADVERTISING'
    ORDER BY mt.name
  `);
  console.log('\n=== OUTDOOR_ADVERTISING material types ===');
  r1.rows.forEach(r => console.log(`  ${r.code}: ${r.name} | KES ${r.typical_cost_min} | image: ${r.image_url ? '✅' : '❌'}`));

  // Check S3 images exist for outdoor
  const r2 = await c.query(`
    SELECT COUNT(*) FROM campaign_supplier_products sp
    JOIN campaign_material_types mt ON mt.id = sp.material_type_id
    JOIN campaign_material_categories mc ON mc.id = mt.category_id
    WHERE mc.code = 'OUTDOOR_ADVERTISING' AND sp.image_url IS NOT NULL
  `);
  console.log('\nOutdoor products with images:', r2.rows[0].count);

  // Check apiClient response shape
  const r3 = await c.query(`SELECT code, name, typical_cost_min, thumbnail_url FROM campaign_material_types LIMIT 3`);
  console.log('\nSample material_type fields:', r3.rows);

  await c.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
