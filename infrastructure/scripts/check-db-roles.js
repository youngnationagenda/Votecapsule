#!/usr/bin/env node
const { Pool } = require('pg');
const pool = new Pool({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432, database: 'votecapsule', user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();

  // Check what roles exist in the roles table
  const allRoles = await client.query('SELECT name FROM roles ORDER BY name');
  console.log('\nAll roles in DB:');
  allRoles.rows.forEach(r => console.log(' ', r.name));

  // Check specific user emails and their DB roles
  const emails = [
    'superadmin@votecapsule.co.ke',
    'admin@votecapsule.co.ke',
    'candidate@votecapsule.co.ke',
    'ccm@votecapsule.co.ke',
    'authority@votecapsule.co.ke',
    'observer@votecapsule.co.ke',
    'agent@votecapsule.co.ke',
    'validator@votecapsule.co.ke',
    'yna@votecapsule.co.ke',
    'ppd@votecapsule.co.ke',
    'azimio@votecapsule.co.ke',
  ];

  console.log('\nUser roles in DB:');
  for (const email of emails) {
    const result = await client.query(
      `SELECT u.email,
              COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]') as roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.email = $1 AND u.deleted_at IS NULL
       GROUP BY u.email`,
      [email]
    );
    const row = result.rows[0];
    if (row) {
      console.log(`  ${email}: ${JSON.stringify(row.roles)}`);
    } else {
      console.log(`  ${email}: NOT FOUND IN DB`);
    }
  }

  client.release();
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
