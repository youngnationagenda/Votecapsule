#!/usr/bin/env node
/**
 * VoteCapsule™ — Aurora DB Full Schema + Row Count Backup
 * Connects to live Aurora, extracts:
 *   - All table names + sizes + row counts
 *   - All column definitions
 *   - All indexes
 *   - All foreign keys
 *   - All enum types
 *   - All applied migrations
 *   - DDL summary SQL
 *   - Campaign-specific tables full data (small tables only)
 */
'use strict';

const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');

const DB_CONFIG = {
  host:     'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port:     5432,
  database: 'votecapsule',
  user:     'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl:      { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
};

const BACKUP_ROOT = 'D:/Votecapsule/Votecapsule backup/database';
const OUT         = path.join(BACKUP_ROOT, 'schema');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function ok(m)  { console.log(`  ✅ ${m}`); }
function info(m){ console.log(`  ℹ  ${m}`); }
function fail(m){ console.log(`  ❌ ${m}`); }

async function main() {
  console.log('════════════════════════════════════════════');
  console.log('  VoteCapsule™ — Aurora Live Schema Backup');
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log('════════════════════════════════════════════\n');

  const pool = new Pool(DB_CONFIG);
  const client = await pool.connect();
  ok('Connected to Aurora PostgreSQL');

  // ── 1. Tables list + pg_stat row estimates ────────────────────────────────
  const tables = await client.query(`
    SELECT
      t.table_name,
      COALESCE(s.n_live_tup, 0) AS row_estimate,
      COALESCE(pg_size_pretty(pg_total_relation_size(
        (quote_ident('public') || '.' || quote_ident(t.table_name))::regclass
      )), '0') AS total_size
    FROM information_schema.tables t
    LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name AND s.schemaname = 'public'
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  `);
  fs.writeFileSync(path.join(OUT, 'tables_list.json'),
    JSON.stringify({ exportedAt: new Date().toISOString(), count: tables.rows.length, tables: tables.rows }, null, 2));
  ok(`Tables: ${tables.rows.length}`);

  // ── 2. Columns ────────────────────────────────────────────────────────────
  const columns = await client.query(`
    SELECT
      c.table_name, c.column_name, c.ordinal_position,
      c.column_default, c.is_nullable,
      c.data_type, c.character_maximum_length,
      c.numeric_precision, c.numeric_scale, c.udt_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    ORDER BY c.table_name, c.ordinal_position
  `);
  const byTable = {};
  for (const r of columns.rows) {
    if (!byTable[r.table_name]) byTable[r.table_name] = [];
    byTable[r.table_name].push(r);
  }
  fs.writeFileSync(path.join(OUT, 'columns_by_table.json'),
    JSON.stringify({ exportedAt: new Date().toISOString(), totalColumns: columns.rows.length, schema: byTable }, null, 2));
  ok(`Columns: ${columns.rows.length} across ${Object.keys(byTable).length} tables`);

  // ── 3. Indexes ────────────────────────────────────────────────────────────
  const indexes = await client.query(`
    SELECT
      c.relname  AS table_name,
      i.relname  AS index_name,
      ix.indisprimary AS is_primary,
      ix.indisunique  AS is_unique,
      pg_get_indexdef(ix.indexrelid) AS index_def
    FROM pg_class c
    JOIN pg_index   ix ON c.oid       = ix.indrelid
    JOIN pg_class    i ON i.oid       = ix.indexrelid
    JOIN pg_namespace n ON n.oid      = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
    ORDER BY c.relname, i.relname
  `);
  fs.writeFileSync(path.join(OUT, 'indexes.json'),
    JSON.stringify({ exportedAt: new Date().toISOString(), count: indexes.rows.length, indexes: indexes.rows }, null, 2));
  ok(`Indexes: ${indexes.rows.length}`);

  // ── 4. Foreign keys ───────────────────────────────────────────────────────
  const fkeys = await client.query(`
    SELECT
      tc.table_name           AS from_table,
      kcu.column_name         AS from_column,
      ccu.table_name          AS to_table,
      ccu.column_name         AS to_column,
      tc.constraint_name,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name
  `);
  fs.writeFileSync(path.join(OUT, 'foreign_keys.json'),
    JSON.stringify({ exportedAt: new Date().toISOString(), count: fkeys.rows.length, foreignKeys: fkeys.rows }, null, 2));
  ok(`Foreign keys: ${fkeys.rows.length}`);

  // ── 5. Enum types ─────────────────────────────────────────────────────────
  const enums = await client.query(`
    SELECT
      t.typname                                                     AS enum_name,
      array_agg(e.enumlabel ORDER BY e.enumsortorder)              AS values
    FROM pg_type t
    JOIN pg_enum e              ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `);
  fs.writeFileSync(path.join(OUT, 'enum_types.json'),
    JSON.stringify({ exportedAt: new Date().toISOString(), count: enums.rows.length, enums: enums.rows }, null, 2));
  ok(`Enum types: ${enums.rows.length}`);

  // ── 6. Migrations ─────────────────────────────────────────────────────────
  const migs = await client.query(
    `SELECT filename, executed_at FROM schema_migrations ORDER BY filename`
  );
  fs.writeFileSync(path.join(OUT, 'migrations_applied.json'),
    JSON.stringify({ exportedAt: new Date().toISOString(), count: migs.rows.length, migrations: migs.rows }, null, 2));
  ok(`Migrations: ${migs.rows.length} applied`);

  // ── 7. Exact row counts (precise COUNT(*) per table) ─────────────────────
  console.log('\n  Counting rows in all tables (this may take a moment)...');
  const rowCounts = {};
  let totalRows = 0;
  for (const t of tables.rows) {
    try {
      const r = await client.query(`SELECT COUNT(*) AS c FROM "${t.table_name}"`);
      const count = parseInt(r.rows[0].c);
      rowCounts[t.table_name] = count;
      totalRows += count;
    } catch(e) {
      rowCounts[t.table_name] = -1;
    }
  }
  fs.writeFileSync(path.join(OUT, 'row_counts_exact.json'),
    JSON.stringify({ exportedAt: new Date().toISOString(), totalRows, rowCounts }, null, 2));
  // Also overwrite root row_counts.json
  fs.writeFileSync(path.join(BACKUP_ROOT, 'row_counts.json'),
    JSON.stringify({ exportedAt: new Date().toISOString(), totalRows, rowCounts }, null, 2));
  ok(`Exact row counts: ${totalRows.toLocaleString()} total rows`);

  // Print top 20 tables
  const sorted = Object.entries(rowCounts)
    .filter(([,v]) => v > 0)
    .sort((a,b)=>b[1]-a[1])
    .slice(0, 20);
  console.log('\n  Top 20 tables by row count:');
  sorted.forEach(([t,c]) => console.log(`    ${t.padEnd(50)} ${c.toLocaleString().padStart(12)} rows`));

  // ── 8. DDL summary SQL ────────────────────────────────────────────────────
  let ddl = `-- VoteCapsule Aurora PostgreSQL Schema DDL Summary\n`;
  ddl +=    `-- Exported: ${new Date().toISOString()}\n`;
  ddl +=    `-- Tables: ${tables.rows.length}  |  Total rows: ${totalRows.toLocaleString()}\n`;
  ddl +=    `-- Migrations applied: ${migs.rows.length}\n\n`;

  // Enums first
  for (const e of enums.rows) {
    ddl += `CREATE TYPE "${e.enum_name}" AS ENUM (${e.values.map(v=>`'${v}'`).join(', ')});\n`;
  }
  if (enums.rows.length) ddl += '\n';

  // Tables
  for (const [tableName, cols] of Object.entries(byTable)) {
    const cnt = rowCounts[tableName] || 0;
    ddl += `-- ${tableName} (${cnt.toLocaleString()} rows)\n`;
    ddl += `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;
    ddl += cols.map(c => {
      let type = c.data_type.toUpperCase();
      if (c.udt_name && type === 'USER-DEFINED') type = c.udt_name;
      if (c.character_maximum_length) type += `(${c.character_maximum_length})`;
      let def = `  "${c.column_name}" ${type}`;
      if (c.column_default) def += ` DEFAULT ${c.column_default}`;
      if (c.is_nullable === 'NO') def += ' NOT NULL';
      return def;
    }).join(',\n');
    ddl += '\n);\n\n';
  }

  // Indexes
  for (const idx of indexes.rows) {
    if (!idx.is_primary) ddl += `${idx.index_def};\n`;
  }

  fs.writeFileSync(path.join(OUT, 'schema_ddl_summary.sql'), ddl);
  ok(`DDL summary written (${(ddl.length/1024).toFixed(1)} KB)`);

  // ── 9. Campaign tables data export (small ones) ───────────────────────────
  console.log('\n  Exporting key campaign + reference table data...');
  const smallTables = [
    'campaign_material_categories', 'campaign_roles', 'roles', 'permissions',
    'pricing_plans', 'tenants', 'campaign_suppliers', 'schema_migrations',
    'nec_counties', 'nec_countries',
  ];
  const dataDir = path.join(OUT, 'table_data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  for (const tbl of smallTables) {
    try {
      const r = await client.query(`SELECT * FROM "${tbl}" LIMIT 1000`);
      fs.writeFileSync(path.join(dataDir, `${tbl}.json`),
        JSON.stringify({ table: tbl, exportedAt: new Date().toISOString(), count: r.rows.length, rows: r.rows }, null, 2));
      info(`  ${tbl}: ${r.rows.length} rows`);
    } catch(e) {
      info(`  ${tbl}: skip (${e.message.substring(0,40)})`);
    }
  }
  ok('Key table data exported');

  // ── 10. Database version + settings ──────────────────────────────────────
  const version = await client.query('SELECT version()');
  const settings = await client.query(`
    SELECT name, setting, unit, category, short_desc
    FROM pg_settings
    WHERE name IN ('max_connections','shared_buffers','work_mem','maintenance_work_mem',
                   'effective_cache_size','checkpoint_completion_target','wal_buffers',
                   'default_statistics_target','random_page_cost','effective_io_concurrency',
                   'min_wal_size','max_wal_size','max_worker_processes','server_version')
    ORDER BY name
  `);
  fs.writeFileSync(path.join(OUT, 'db_version_settings.json'), JSON.stringify({
    exportedAt: new Date().toISOString(),
    version: version.rows[0].version,
    settings: settings.rows,
  }, null, 2));
  ok(`DB version: ${version.rows[0].version.split(' ').slice(0,2).join(' ')}`);

  client.release();
  await pool.end();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════');
  console.log('  Schema backup complete!');
  const files = fs.readdirSync(OUT).length + fs.readdirSync(dataDir).length;
  console.log(`  Files written: ${files}`);
  console.log(`  Location: ${OUT}`);
  console.log(`  Finished: ${new Date().toISOString()}`);
  console.log('════════════════════════════════════════════');
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
