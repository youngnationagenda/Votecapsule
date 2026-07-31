/**
 * Vote Capsule™ Database Connection
 *
 * Manages Aurora PostgreSQL connections.
 * Uses environment variables for configuration — never hardcode credentials.
 * Credentials are sourced from AWS Secrets Manager in production.
 */

import { Pool, PoolConfig } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolMin?: number;
  poolMax?: number;
  connectionTimeoutMs?: number;
}

export function createDatabaseConfig(): DatabaseConfig {
  const host = process.env['DB_HOST'];
  const port = process.env['DB_PORT'];
  const database = process.env['DB_NAME'];
  const username = process.env['DB_USER'];
  const password = process.env['DB_PASSWORD'];

  if (!host || !database || !username || !password) {
    throw new Error(
      'Missing required database environment variables: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD',
    );
  }

  return {
    host,
    port: port ? parseInt(port, 10) : 5432,
    database,
    username,
    password,
    ssl: process.env['DB_SSL'] === 'true',
    poolMin: process.env['DB_POOL_MIN'] ? parseInt(process.env['DB_POOL_MIN'], 10) : 2,
    poolMax: process.env['DB_POOL_MAX'] ? parseInt(process.env['DB_POOL_MAX'], 10) : 10,
    connectionTimeoutMs: 30000,
  };
}

export function createPool(config: DatabaseConfig): Pool {
  const poolConfig: PoolConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    min: config.poolMin ?? 2,
    max: config.poolMax ?? 10,
    connectionTimeoutMillis: config.connectionTimeoutMs ?? 30000,
    idleTimeoutMillis: 30000,
  };

  if (config.ssl) {
    poolConfig.ssl = { rejectUnauthorized: true };
  }

  return new Pool(poolConfig);
}
