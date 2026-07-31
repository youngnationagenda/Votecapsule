/**
 * Vote Capsule™ Database Seed Runner
 *
 * Seeds reference data and system defaults.
 * Seeds are idempotent — safe to run multiple times.
 *
 * Usage: pnpm db:seed
 */

import { Pool } from 'pg';
import { createDatabaseConfig, createPool } from './connection';

export async function runSeeds(): Promise<void> {
  const config = createDatabaseConfig();
  const pool = createPool(config);

  try {
    process.stdout.write('🌱 Running database seeds...\n');
    await seedSystemRoles(pool);
    await seedSystemPermissions(pool);
    process.stdout.write('✅ Database seeding complete.\n');
  } finally {
    await pool.end();
  }
}

async function seedSystemRoles(pool: Pool): Promise<void> {
  const systemRoles = [
    {
      name: 'PLATFORM_SUPER_ADMIN',
      display_name: 'Platform Super Administrator',
      description: 'Vote Capsule Technologies internal administrator with full platform access',
      level: 'platform',
    },
    {
      name: 'TENANT_ADMIN',
      display_name: 'Tenant Administrator',
      description: 'Organization administrator with full access within their tenant',
      level: 'tenant',
    },
    {
      name: 'ELECTION_COMMISSIONER',
      display_name: 'Election Commissioner',
      description: 'Election Authority administrator',
      level: 'tenant',
    },
    {
      name: 'RETURNING_OFFICER',
      display_name: 'Returning Officer',
      description: 'County/Constituency returning officer',
      level: 'geography',
    },
    {
      name: 'PRESIDING_OFFICER',
      display_name: 'Presiding Officer',
      description: 'Polling station presiding officer',
      level: 'geography',
    },
    {
      name: 'CAPSULE_AGENT',
      display_name: 'Capsule Agent',
      description: 'Field agent responsible for capturing evidence at polling stations',
      level: 'geography',
    },
    {
      name: 'VALIDATOR',
      display_name: 'Validator',
      description: 'Reviews and approves evidence capsules',
      level: 'tenant',
    },
    {
      name: 'PARTY_ADMIN',
      display_name: 'Party Administrator',
      description: 'Political party administrator',
      level: 'tenant',
    },
    {
      name: 'PARTY_AGENT',
      display_name: 'Party Agent',
      description: 'Party polling agent — read-only observer at polling stations',
      level: 'geography',
    },
    {
      name: 'CANDIDATE',
      display_name: 'Candidate',
      description: 'Individual electoral candidate',
      level: 'tenant',
    },
    {
      name: 'OBSERVER_ADMIN',
      display_name: 'Observer Administrator',
      description: 'Observer organization administrator',
      level: 'tenant',
    },
    {
      name: 'OBSERVER_AGENT',
      display_name: 'Observer Agent',
      description: 'Individual observer accredited by an observer organization',
      level: 'geography',
    },
    {
      name: 'MEDIA_ADMIN',
      display_name: 'Media Administrator',
      description: 'Media organization administrator',
      level: 'tenant',
    },
    {
      name: 'MEDIA_REPORTER',
      display_name: 'Media Reporter',
      description: 'Individual reporter — read-only access to published data',
      level: 'tenant',
    },
    {
      name: 'PUBLIC',
      display_name: 'Public',
      description: 'Unauthenticated public access to published results',
      level: 'platform',
    },
    {
      name: 'SUPPORT_ADMIN',
      display_name: 'Support Administrator',
      description: 'Vote Capsule support team member',
      level: 'platform',
    },
  ];

  for (const role of systemRoles) {
    await pool.query(
      `INSERT INTO roles (name, display_name, description, level, is_system)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (name) DO NOTHING`,
      [role.name, role.display_name, role.description, role.level],
    );
  }

  process.stdout.write(`✅ Seeded ${systemRoles.length} system roles.\n`);
}

async function seedSystemPermissions(pool: Pool): Promise<void> {
  const resources = [
    'user', 'role', 'permission', 'tenant', 'member', 'subscription',
    'invitation', 'device', 'election', 'candidate', 'evidence_capsule',
    'audit_log', 'trust_anchor', 'billing',
  ];
  const actions = ['create', 'read', 'update', 'delete', 'approve', 'publish', 'export'];
  const scopes = ['own', 'tenant', 'geography', 'global'];

  let count = 0;
  for (const resource of resources) {
    for (const action of actions) {
      for (const scope of scopes) {
        await pool.query(
          `INSERT INTO permissions (resource, action, scope, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (resource, action, scope) DO NOTHING`,
          [resource, action, scope, `${action} ${resource} at ${scope} level`],
        );
        count++;
      }
    }
  }

  process.stdout.write(`✅ Seeded ${count} permissions.\n`);
}

// Run if called directly
if (require.main === module) {
  runSeeds().catch((error: unknown) => {
    process.stderr.write(`Seed error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
