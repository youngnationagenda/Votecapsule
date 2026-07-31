/**
 * Vote Capsule™ — Standalone Migration Runner
 * 
 * Runs all SQL migrations against Aurora PostgreSQL.
 * Order: 001-014 (root) then nec/* (128 files)
 * 
 * Usage: node run-migrations.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'packages', 'database', 'migrations');
const NEC_DIR = path.join(MIGRATIONS_DIR, 'nec');

const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'votecapsule',
  user:     process.env.DB_USER     || 'vcadmin',
  password: process.env.DB_PASSWORD || 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl:      { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
};

async function main() {
  const client = new Client(DB_CONFIG);
  
  console.log(`Connecting to Aurora: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  
  try {
    await client.connect();
    console.log('Connected successfully.\n');

    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Get already-executed migrations
    const { rows } = await client.query('SELECT filename FROM schema_migrations ORDER BY id');
    const executed = new Set(rows.map(r => r.filename));
    console.log(`Already executed: ${executed.size} migrations\n`);

    // Collect migration files in order
    const allMigrations = [];

    // Root migrations (001-014)
    if (fs.existsSync(MIGRATIONS_DIR)) {
      const rootFiles = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();
      rootFiles.forEach(f => allMigrations.push({ key: f, file: path.join(MIGRATIONS_DIR, f) }));
    }

    // NEC migrations (128 files)
    if (fs.existsSync(NEC_DIR)) {
      const necFiles = fs.readdirSync(NEC_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();
      necFiles.forEach(f => allMigrations.push({ key: `nec/${f}`, file: path.join(NEC_DIR, f) }));
    }

    const pending = allMigrations.filter(m => !executed.has(m.key));
    console.log(`Total migrations: ${allMigrations.length}`);
    console.log(`Pending:          ${pending.length}\n`);

    if (pending.length === 0) {
      console.log('All migrations are up to date.');
      return;
    }

    let ran = 0;
    let errors = 0;

    for (const migration of pending) {
      const sql = fs.readFileSync(migration.file, 'utf-8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [migration.key]);
        await client.query('COMMIT');
        ran++;
        if (ran <= 20 || ran % 50 === 0 || migration.key.startsWith('nec/0') && !migration.key.includes('seed_stations')) {
          console.log(`  ✅ [${ran}/${pending.length}] ${migration.key}`);
        }
      } catch (err) {
        await client.query('ROLLBACK');
        errors++;
        console.error(`  ❌ FAILED: ${migration.key}`);
        console.error(`     Error: ${err.message.slice(0, 200)}`);
        // Continue with other migrations — some may be independent
        if (errors > 5) {
          console.error('\nToo many errors. Stopping.');
          break;
        }
      }
    }

    console.log(`\n✅ Migrations complete: ${ran} ran, ${errors} failed`);

    // Verify key tables exist
    const tables = ['users', 'roles', 'tenants', 'evidence_capsules', 'trust_anchors', 
                    'ai_verification_jobs', 'workflow_executions', 'nec_counties', 'nec_polling_stations'];
    console.log('\nVerifying tables:');
    for (const table of tables) {
      try {
        const r = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ✅ ${table}: ${r.rows[0].count} rows`);
      } catch (e) {
        console.log(`  ❌ ${table}: ${e.message.slice(0, 80)}`);
      }
    }

  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

main().catch(err => {
  console.error('Fatal migration error:', err.message);
  process.exit(1);
});
