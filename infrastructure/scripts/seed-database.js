/**
 * Vote Capsule™ — Database Seed Script
 * Seeds system roles, permissions, and the first Super Admin user record.
 */
const { Client } = require('pg');
const { randomUUID } = require('crypto');

const DB_CONFIG = {
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'votecapsule',
  user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
};

// Cognito sub for admin@votecapsule.co.ke
const ADMIN_COGNITO_SUB = '8438f418-c0e1-7042-9417-b2f0165c5be4';
const ADMIN_EMAIL = 'admin@votecapsule.co.ke';

const SYSTEM_ROLES = [
  { name: 'PLATFORM_SUPER_ADMIN', display: 'Platform Super Administrator', level: 'platform', desc: 'Vote Capsule Technologies internal administrator' },
  { name: 'TENANT_ADMIN', display: 'Tenant Administrator', level: 'tenant', desc: 'Organization administrator' },
  { name: 'ELECTION_COMMISSIONER', display: 'Election Commissioner', level: 'tenant', desc: 'Election Authority administrator' },
  { name: 'RETURNING_OFFICER', display: 'Returning Officer', level: 'geography', desc: 'County/Constituency returning officer' },
  { name: 'PRESIDING_OFFICER', display: 'Presiding Officer', level: 'geography', desc: 'Polling station presiding officer' },
  { name: 'CAPSULE_AGENT', display: 'Capsule Agent', level: 'geography', desc: 'Field agent capturing evidence' },
  { name: 'VALIDATOR', display: 'Validator', level: 'tenant', desc: 'Reviews and approves evidence capsules' },
  { name: 'PARTY_ADMIN', display: 'Party Administrator', level: 'tenant', desc: 'Political party administrator' },
  { name: 'PARTY_AGENT', display: 'Party Agent', level: 'geography', desc: 'Party polling agent — read-only' },
  { name: 'CANDIDATE', display: 'Candidate', level: 'tenant', desc: 'Individual electoral candidate' },
  { name: 'OBSERVER_ADMIN', display: 'Observer Administrator', level: 'tenant', desc: 'Observer organization administrator' },
  { name: 'OBSERVER_AGENT', display: 'Observer Agent', level: 'geography', desc: 'Individual observer' },
  { name: 'MEDIA_ADMIN', display: 'Media Administrator', level: 'tenant', desc: 'Media organization administrator' },
  { name: 'MEDIA_REPORTER', display: 'Media Reporter', level: 'tenant', desc: 'Individual reporter — read-only' },
  { name: 'PUBLIC', display: 'Public', level: 'platform', desc: 'Unauthenticated public access' },
  { name: 'SUPPORT_ADMIN', display: 'Support Administrator', level: 'platform', desc: 'Vote Capsule support team' },
];

async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('Connected to Aurora. Seeding...\n');

  // Seed system roles
  console.log('Seeding system roles...');
  for (const role of SYSTEM_ROLES) {
    await client.query(
      `INSERT INTO roles (id, name, display_name, description, level, is_system)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (name) DO NOTHING`,
      [randomUUID(), role.name, role.display, role.desc, role.level]
    );
  }
  const { rows: roleRows } = await client.query('SELECT COUNT(*) FROM roles WHERE is_system = TRUE');
  console.log(`  ✅ ${roleRows[0].count} system roles seeded`);

  // Seed basic permissions
  console.log('Seeding permissions...');
  const resources = ['user','role','tenant','evidence_capsule','trust_anchor','audit_log'];
  const actions = ['create','read','update','delete','approve','publish'];
  const scopes = ['own','tenant','geography','global'];
  let permCount = 0;
  for (const resource of resources) {
    for (const action of actions) {
      for (const scope of scopes) {
        await client.query(
          `INSERT INTO permissions (id, resource, action, scope, description)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (resource, action, scope) DO NOTHING`,
          [randomUUID(), resource, action, scope, `${action} ${resource} at ${scope} level`]
        );
        permCount++;
      }
    }
  }
  const { rows: permRows } = await client.query('SELECT COUNT(*) FROM permissions');
  console.log(`  ✅ ${permRows[0].count} permissions seeded`);

  // Create Super Admin user record
  console.log('\nCreating Super Admin user...');
  const userId = randomUUID();
  await client.query(
    `INSERT INTO users (id, email, email_verified, cognito_sub, status)
     VALUES ($1, $2, TRUE, $3, 'active')
     ON CONFLICT (email) DO UPDATE SET
       cognito_sub = EXCLUDED.cognito_sub,
       email_verified = TRUE,
       status = 'active',
       updated_at = NOW()`,
    [userId, ADMIN_EMAIL, ADMIN_COGNITO_SUB]
  );

  // Get the user ID (may differ if already existed)
  const { rows: userRows } = await client.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);
  const actualUserId = userRows[0].id;

  // Create user profile
  await client.query(
    `INSERT INTO user_profiles (id, user_id, first_name, last_name, language, timezone)
     VALUES ($1, $2, 'Platform', 'Super Admin', 'en', 'Africa/Nairobi')
     ON CONFLICT (user_id) DO NOTHING`,
    [randomUUID(), actualUserId]
  );

  // Assign PLATFORM_SUPER_ADMIN role
  const { rows: roleId } = await client.query("SELECT id FROM roles WHERE name = 'PLATFORM_SUPER_ADMIN'");
  if (roleId.length > 0) {
    await client.query(
      `INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_at)
       VALUES ($1, $2, $3, NULL, NOW())
       ON CONFLICT (user_id, role_id, tenant_id) DO NOTHING`,
      [randomUUID(), actualUserId, roleId[0].id]
    );
    console.log(`  ✅ User: ${ADMIN_EMAIL} (ID: ${actualUserId})`);
    console.log(`  ✅ Role: PLATFORM_SUPER_ADMIN assigned`);
    console.log(`  ✅ Cognito sub: ${ADMIN_COGNITO_SUB}`);
  }

  // Final counts
  console.log('\n=== Final Database State ===');
  const checks = [
    ['users', 'SELECT COUNT(*) FROM users'],
    ['roles (system)', 'SELECT COUNT(*) FROM roles WHERE is_system = TRUE'],
    ['permissions', 'SELECT COUNT(*) FROM permissions'],
    ['nec_counties', 'SELECT COUNT(*) FROM nec_counties'],
    ['nec_polling_stations', 'SELECT COUNT(*) FROM nec_polling_stations WHERE active = TRUE'],
    ['total registered voters', "SELECT SUM(registered_voters) FROM nec_counties WHERE is_special = FALSE"],
  ];
  for (const [label, sql] of checks) {
    const r = await client.query(sql);
    const val = r.rows[0].count ?? r.rows[0].sum ?? 'N/A';
    console.log(`  ${label}: ${parseInt(val).toLocaleString()}`);
  }

  await client.end();
  console.log('\n✅ Database seeding complete!');
}

main().catch(e => { console.error('Seed error:', e.message); process.exit(1); });
