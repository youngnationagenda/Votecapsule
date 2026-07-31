/**
 * Vote Capsule™ Database Migration Runner
 *
 * Runs SQL migration files in the correct order:
 * 1. Root migrations (001-010 foundation + 011 evidence + 012 trust) — numerical order
 * 2. NEC migrations (nec/ subdirectory) — alphabetical order within subdirectory
 *
 * Migrations are idempotent — safe to run multiple times.
 * Tracks executed migrations in the schema_migrations table.
 *
 * Usage: pnpm db:migrate
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import { createDatabaseConfig, createPool } from './connection';

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const NEC_MIGRATIONS_DIR = path.join(MIGRATIONS_DIR, 'nec');

async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function getExecutedMigrations(pool: Pool): Promise<string[]> {
  const result = await pool.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY id ASC',
  );
  return result.rows.map((row) => row.filename);
}

async function runMigration(pool: Pool, filename: string, sql: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    process.stdout.write(`  ✅ Migrated: ${filename}\n`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(
      `Migration failed for ${filename}: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    client.release();
  }
}

/**
 * Collect all migration files in the correct run order:
 *
 * Order:
 * 1. Root migrations (*.sql files in migrations/ root) — sorted alphabetically
 *    These are numbered 001_... through 012_... so alpha sort = numerical sort
 *
 * 2. NEC migrations (*.sql files in migrations/nec/) — sorted alphabetically
 *    Prefixed with nec/ in the tracking key to avoid collisions with root files
 */
function collectMigrationFiles(): { filename: string; filepath: string }[] {
  const results: { filename: string; filepath: string }[] = [];

  // Root migrations (foundation + evidence + trust)
  if (fs.existsSync(MIGRATIONS_DIR)) {
    const rootFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql') && !f.startsWith('.'))
      .sort();
    for (const filename of rootFiles) {
      results.push({ filename, filepath: path.join(MIGRATIONS_DIR, filename) });
    }
  }

  // NEC migrations — tracked as "nec/{filename}" to prevent key collision
  if (fs.existsSync(NEC_MIGRATIONS_DIR)) {
    const necFiles = fs
      .readdirSync(NEC_MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql') && !f.startsWith('.'))
      .sort();
    for (const filename of necFiles) {
      results.push({
        filename: `nec/${filename}`,
        filepath: path.join(NEC_MIGRATIONS_DIR, filename),
      });
    }
  }

  return results;
}

export async function runMigrations(): Promise<void> {
  const config = createDatabaseConfig();
  const pool = createPool(config);

  try {
    await ensureMigrationsTable(pool);
    const executed = await getExecutedMigrations(pool);
    const executedSet = new Set(executed);

    const allMigrations = collectMigrationFiles();
    const pending = allMigrations.filter((m) => !executedSet.has(m.filename));

    if (pending.length === 0) {
      process.stdout.write('✅ All migrations are up to date.\n');
      return;
    }

    process.stdout.write(`\n🔄 Running ${pending.length} pending migration(s)...\n`);

    // Separate root and NEC for reporting
    const rootPending = pending.filter((m) => !m.filename.startsWith('nec/'));
    const necPending = pending.filter((m) => m.filename.startsWith('nec/'));

    if (rootPending.length > 0) {
      process.stdout.write(`\n📋 Foundation/Service migrations (${rootPending.length}):\n`);
    }

    for (const migration of rootPending) {
      const sql = fs.readFileSync(migration.filepath, 'utf-8');
      await runMigration(pool, migration.filename, sql);
    }

    if (necPending.length > 0) {
      process.stdout.write(`\n🗺️  NEC Geography migrations (${necPending.length}):\n`);
    }

    for (const migration of necPending) {
      const sql = fs.readFileSync(migration.filepath, 'utf-8');
      await runMigration(pool, migration.filename, sql);
    }

    process.stdout.write(
      `\n✅ Ran ${pending.length} migration(s) successfully.\n` +
      `   Root: ${rootPending.length} | NEC: ${necPending.length}\n`,
    );
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations().catch((error: unknown) => {
    process.stderr.write(
      `Migration error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  });
}
