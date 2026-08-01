const { Client } = require('pg');
const client = new Client({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 30000
});
client.connect().then(async () => {
  const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='schema_migrations' ORDER BY ordinal_position");
  console.log('schema_migrations columns:', cols.rows.map(r => r.column_name).join(', '));
  const chk = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('audit_logs','security_events','access_logs','compliance_reports','system_logs','pricing_plans','subscriptions','licenses','invoices','payments') ORDER BY tablename");
  console.log('Audit/Billing tables already existing:', chk.rows.map(r => r.tablename).join(', ') || 'NONE');
  await client.end();
  console.log('Done.');
}).catch(e => { console.error('DB error:', e.message); process.exit(1); });
