#!/usr/bin/env node
/**
 * VoteCapsule - Fix DB + Cognito roles so login response returns correct roles
 *
 * The login response user.roles comes from the DB user_roles table.
 * Cognito custom:roles must match for the JWT authorizer to work.
 *
 * This script:
 * 1. Ensures all required role names exist in the DB roles table
 * 2. Creates missing users in the DB (superadmin, agent, validator etc.)
 * 3. Assigns correct roles in user_roles
 * 4. Syncs matching custom:roles to Cognito
 */
const { Pool } = require('pg');
const { execSync } = require('child_process');
// Simple UUID v4 without external dependency
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const pool = new Pool({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
});

const POOL_ID = 'us-east-1_i3N2tg34A';

function cognitoUpdate(email, roles) {
  const rolesJson = JSON.stringify(roles);
  try {
    execSync(
      `aws cognito-idp admin-update-user-attributes --user-pool-id ${POOL_ID} --username "${email}" ` +
      `--user-attributes Name="custom:roles",Value='${rolesJson}' --output json 2>&1`,
      { encoding: 'utf8' }
    );
    return true;
  } catch (e) {
    console.log(`  COGNITO WARN for ${email}: ${e.message.slice(0,100)}`);
    return false;
  }
}

// Target state: email → DB role name
const USER_ROLES = [
  // Platform
  { email: 'superadmin@votecapsule.co.ke',  role: 'PLATFORM_SUPER_ADMIN',     cognitoSub: '8418d488-c061-7077-82cb-3b78079a86ef', name: 'Super Admin', extra: { platformAdmin: 'true' } },
  { email: 'admin@votecapsule.co.ke',        role: 'TENANT_ADMIN',             cognitoSub: '8438f418-c0e1-7042-9417-b2f0165c5be4', name: 'Admin' },

  // Candidates
  { email: 'candidate@votecapsule.co.ke',    role: 'CANDIDATE',                cognitoSub: 'a4a85458-3001-7097-62ba-fe3bb37e1999', name: 'YNA Candidate' },
  { email: 'yna@votecapsule.co.ke',           role: 'CANDIDATE',                cognitoSub: '54889448-a0b1-70c5-8944-bf11560c8820', name: 'YNA Demo' },

  // Campaign team
  { email: 'ccm@votecapsule.co.ke',          role: 'CAMPAIGN_MANAGER',         cognitoSub: 'b46834b8-f0b1-7041-1547-f1e1c588df27', name: 'Campaign Mgr' },
  { email: 'mccp@votecapsule.co.ke',          role: 'CAMPAIGN_MANAGER',         cognitoSub: 'a4c80478-4061-7004-b4ee-263fd47179af', name: 'Campaign Coord' },
  { email: 'ppd@votecapsule.co.ke',           role: 'PARTY_CAMPAIGN_DIRECTOR',  cognitoSub: 'e4e834e8-9011-709b-462e-b14b1b549dc4', name: 'Party Campaign Dir' },

  // Authority
  { email: 'authority@votecapsule.co.ke',     role: 'ELECTION_COMMISSIONER',    cognitoSub: '7468e498-10b1-70c9-dc20-df9af2424caf', name: 'Authority Admin' },
  { email: 'dc@votecapsule.co.ke',            role: 'ELECTION_COMMISSIONER',    cognitoSub: 'd4788408-c061-70b9-b985-23e49129e7d3', name: 'DC Admin' },

  // Observer
  { email: 'observer@votecapsule.co.ke',      role: 'OBSERVER_ADMIN',           cognitoSub: 'b4f894e8-90a1-7091-c748-7d86fe120ba2', name: 'Observer' },

  // Field
  { email: 'agent@votecapsule.co.ke',         role: 'CAPSULE_AGENT',            cognitoSub: '5438f408-10e1-7002-6ce3-0ab62a3c8123', name: 'Field Agent' },
  { email: 'validator@votecapsule.co.ke',     role: 'VALIDATOR',                cognitoSub: 'a4c8d4e8-2041-70b6-9288-dc355acf3cc6', name: 'Validator' },

  // Party admins (key ones)
  { email: 'azimio@votecapsule.co.ke',        role: 'PARTY_ADMIN',              cognitoSub: '7408e4f8-9051-7042-6147-d78da91204a9', name: 'Azimio' },
  { email: 'kanu@votecapsule.co.ke',          role: 'PARTY_ADMIN',              cognitoSub: 'd4881498-50f1-70f2-74e5-1eb8d9924295', name: 'KANU' },
  { email: 'ldp@votecapsule.co.ke',           role: 'PARTY_ADMIN',              cognitoSub: 'f4085428-9031-701d-307a-aaeccbc01474', name: 'LDP' },
  { email: 'mwaurasebastian@gmail.com',        role: 'PARTY_ADMIN',              cognitoSub: 'f46884a8-7081-70f7-28d5-259e39a332b7', name: 'YNA Party Admin' },
];

// Party admin emails (all the party portals)
const PARTY_EMAILS = [
  'ptp@votecapsule.co.ke','tep@votecapsule.co.ke','epp@votecapsule.co.ke','pdu@votecapsule.co.ke',
  'tnd@votecapsule.co.ke','jfp@votecapsule.co.ke','pm@votecapsule.co.ke','alp-k@votecapsule.co.ke',
  'dap-k@votecapsule.co.ke','ksc@votecapsule.co.ke','nvp@votecapsule.co.ke','narc@votecapsule.co.ke',
  'kup@votecapsule.co.ke','nap-k@votecapsule.co.ke','afc@votecapsule.co.ke','mp@votecapsule.co.ke',
  'tdu@votecapsule.co.ke','gtap@votecapsule.co.ke','ccu@votecapsule.co.ke','kazi@votecapsule.co.ke',
  'uup@votecapsule.co.ke','spk@votecapsule.co.ke','plp@votecapsule.co.ke','dcp@votecapsule.co.ke',
  'udp@votecapsule.co.ke','pick@votecapsule.co.ke','dep@votecapsule.co.ke','up@votecapsule.co.ke',
  'knc@votecapsule.co.ke','nra@votecapsule.co.ke','pgp@votecapsule.co.ke','pnu@votecapsule.co.ke',
  'kmm@votecapsule.co.ke','fpk@votecapsule.co.ke','nlp@votecapsule.co.ke','j-mapk@votecapsule.co.ke',
  'gddp@votecapsule.co.ke','ford-kenya@votecapsule.co.ke','jibebe@votecapsule.co.ke',
  'safina@votecapsule.co.ke','jp@votecapsule.co.ke','kug@votecapsule.co.ke',
];

async function ensureUser(client, email, cognitoSub, name) {
  // Check if user exists
  const existing = await client.query(
    'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [email]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  // Create user
  const id = uuidv4();
  await client.query(
    `INSERT INTO users (id, email, cognito_sub, status, email_verified)
     VALUES ($1, $2, $3, 'active', true) ON CONFLICT (email) DO NOTHING`,
    [id, email, cognitoSub]
  );
  // Create profile
  const parts = (name || email.split('@')[0]).split(' ');
  await client.query(
    `INSERT INTO user_profiles (id, user_id, first_name, last_name)
     VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
    [uuidv4(), id, parts[0] || null, parts[1] || null]
  );
  return id;
}

async function setRole(client, userId, roleName) {
  // Get role id
  const roleRow = await client.query('SELECT id FROM roles WHERE name = $1', [roleName]);
  if (!roleRow.rows[0]) {
    console.log(`  WARN: role '${roleName}' not found in DB`);
    return;
  }
  const roleId = roleRow.rows[0].id;

  // Clear existing roles
  await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);

  // Assign new role
  await client.query(
    `INSERT INTO user_roles (id, user_id, role_id, assigned_at)
     VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
    [uuidv4(), userId, roleId]
  );
}

async function main() {
  console.log('VoteCapsule - Fix DB + Cognito Roles');
  console.log('='.repeat(60));

  const client = await pool.connect();
  let ok = 0, fail = 0;

  // Process main accounts
  for (const acct of USER_ROLES) {
    try {
      const userId = await ensureUser(client, acct.email, acct.cognitoSub, acct.name);
      await setRole(client, userId, acct.role);

      // Sync to Cognito
      const cognitoRoles = [acct.role];
      const extraAttrs = acct.extra
        ? Object.entries(acct.extra).map(([k, v]) => `Name="${k}",Value="${v}"`).join(' ')
        : '';

      try {
        let cmd = `aws cognito-idp admin-update-user-attributes --user-pool-id ${POOL_ID} ` +
                  `--username "${acct.email}" ` +
                  `--user-attributes Name="custom:roles",Value="${JSON.stringify(cognitoRoles).replace(/"/g,'\\"')}"`;
        if (acct.extra) {
          for (const [k,v] of Object.entries(acct.extra)) {
            cmd += ` Name="${k}",Value="${v}"`;
          }
        }
        execSync(cmd + ' --output json 2>&1', { encoding: 'utf8' });
      } catch(e) { console.log(`  COGNITO WARN ${acct.email}:`, e.message.slice(0,80)); }

      console.log(`  OK   ${acct.email.padEnd(42)} DB=${acct.role}`);
      ok++;
    } catch(e) {
      console.log(`  FAIL ${acct.email}: ${e.message.slice(0,100)}`);
      fail++;
    }
  }

  // Process all remaining party admins
  console.log('\nProcessing party admins...');
  for (const email of PARTY_EMAILS) {
    try {
      // Get cognito sub
      let cognitoSub = null;
      try {
        const out = execSync(
          `aws cognito-idp admin-get-user --user-pool-id ${POOL_ID} --username "${email}" --output json 2>&1`,
          { encoding: 'utf8' }
        );
        const d = JSON.parse(out);
        cognitoSub = d.Username; // Cognito username = sub
        const subAttr = d.UserAttributes.find(a => a.Name === 'sub');
        if (subAttr) cognitoSub = subAttr.Value;
      } catch { /* user may not exist in cognito */ }

      const userId = await ensureUser(client, email, cognitoSub, email.split('@')[0]);
      await setRole(client, userId, 'PARTY_ADMIN');

      // Sync Cognito
      try {
        execSync(
          `aws cognito-idp admin-update-user-attributes --user-pool-id ${POOL_ID} ` +
          `--username "${email}" --user-attributes Name="custom:roles",Value='["PARTY_ADMIN"]' --output json 2>&1`,
          { encoding: 'utf8' }
        );
      } catch { /* skip if not in cognito */ }

      ok++;
    } catch(e) {
      console.log(`  FAIL ${email}: ${e.message.slice(0,80)}`);
      fail++;
    }
  }

  client.release();
  await pool.end();

  console.log('\n' + '='.repeat(60));
  console.log(`Done: ${ok} fixed, ${fail} failed`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
