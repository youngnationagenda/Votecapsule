// ============================================================
// VoteCapsule™ — Migration Runner Lambda
// Runs SQL migrations against Aurora PostgreSQL
// Invoked once manually, then deleted.
// ============================================================
'use strict';

const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const DB_HOST       = process.env.DB_HOST;
const DB_PORT       = parseInt(process.env.DB_PORT || '5432', 10);
const DB_NAME       = process.env.DB_NAME;
const SECRET_ARN    = process.env.DB_SECRET_ARN;
const smClient      = new SecretsManagerClient({ region: 'us-east-1' });

async function getDbCreds() {
  const resp = await smClient.send(new GetSecretValueCommand({ SecretId: SECRET_ARN }));
  return JSON.parse(resp.SecretString);
}

exports.handler = async (event) => {
  const { sql, label } = event;
  if (!sql) return { statusCode: 400, body: 'sql is required' };

  const creds  = await getDbCreds();
  const client = new Client({
    host:     DB_HOST,
    port:     DB_PORT,
    database: DB_NAME,
    user:     creds.username,
    password: creds.password,
    ssl:      { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log(`Running migration: ${label || 'unnamed'}`);
    const result = await client.query(sql);
    await client.end();
    console.log(`Migration complete: ${label}`);
    const rows = Array.isArray(result) ? result[result.length - 1]?.rows : result?.rows;
    return { statusCode: 200, body: `Migration '${label}' completed successfully`, rows: rows || [] };
  } catch (err) {
    await client.end().catch(() => {});
    console.error(`Migration failed: ${label}`, err.message);
    return { statusCode: 500, body: `Migration failed: ${err.message}` };
  }
};
