const { Client } = require('pg');
const c = new Client({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
});
async function run() {
  await c.connect();

  // 1. Rename supplier in campaign_suppliers
  const r1 = await c.query(`
    UPDATE campaign_suppliers
    SET company_name        = 'Me Advertising',
        contact_name        = 'Me Advertising Team',
        contact_email       = 'info@meadvertising.co.ke',
        website             = 'https://meadvertising.co.ke/',
        location            = 'Nairobi, Kenya',
        notes               = 'Primary branded merchandise supplier — campaign materials portal',
        updated_at          = NOW()
    WHERE company_name = 'Me Advertising'
    RETURNING id, company_name
  `);
  console.log('Supplier renamed:', r1.rows);

  // 2. Update product descriptions to remove old supplier references
  const r2 = await c.query(`
    UPDATE campaign_supplier_products
    SET description = REPLACE(description, 'Me Advertising', 'Me Advertising'),
        metadata    = REPLACE(metadata::text, 'Me Advertising', 'Me Advertising')::jsonb,
        updated_at  = NOW()
    WHERE description ILIKE '%kazisafi%' OR metadata::text ILIKE '%kazisafi%'
  `);
  console.log('Products updated:', r2.rowCount);

  // 3. Update image URLs (change old prefix to /me-advertising/)
  const r3 = await c.query(`
    UPDATE campaign_supplier_products
    SET image_url   = REPLACE(image_url, '/suppliers/me-advertising/', '/suppliers/me-advertising/'),
        updated_at  = NOW()
    WHERE image_url LIKE '%/suppliers/me-advertising/%'
  `);
  console.log('Image URLs updated:', r3.rowCount);

  // 4. Update material_types thumbnail_url
  const r4 = await c.query(`
    UPDATE campaign_material_types
    SET thumbnail_url = REPLACE(thumbnail_url, '/suppliers/me-advertising/', '/suppliers/me-advertising/'),
        updated_at    = NOW()
    WHERE thumbnail_url LIKE '%/suppliers/me-advertising/%'
  `);
  console.log('Material type thumbnails updated:', r4.rowCount);

  // 5. Update product_url references
  const r5 = await c.query(`
    UPDATE campaign_supplier_products
    SET product_url = REPLACE(product_url, 'meadvertising.co.ke', 'meadvertising.co.ke'),
        updated_at  = NOW()
    WHERE product_url LIKE '%kazisafi%'
  `);
  console.log('Product URLs updated:', r5.rowCount);

  // 6. Verify
  const check = await c.query(`
    SELECT company_name, website, contact_email FROM campaign_suppliers LIMIT 3
  `);
  console.log('\nSupplier records now:', check.rows);

  await c.end();
  console.log('\nAll Me Advertising references removed from DB.');
}
run().catch(e => { console.error(e.message); process.exit(1); });
