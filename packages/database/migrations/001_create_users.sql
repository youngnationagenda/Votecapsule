-- Vote Capsule™ Migration 001
-- Creates the users table
-- Domain: Foundation / Identity
-- Owned by: Identity Service

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(255) UNIQUE NOT NULL,
  email_verified    BOOLEAN DEFAULT FALSE,
  cognito_sub       VARCHAR(255) UNIQUE,
  status            VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
  last_login_at     TIMESTAMP,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  deleted_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_cognito_sub ON users(cognito_sub);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON TABLE users IS 'Platform users — authenticated individuals across all tenant types';
COMMENT ON COLUMN users.cognito_sub IS 'Amazon Cognito User Pool subject identifier';
COMMENT ON COLUMN users.deleted_at IS 'Soft delete — NULL means active, non-NULL means deleted';
