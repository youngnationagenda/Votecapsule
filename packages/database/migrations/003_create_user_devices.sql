-- Vote Capsule™ Migration 003
-- Creates the user_devices table
-- Domain: Foundation / Identity
-- Used for mobile trust — SHA-256 hash verification chain

CREATE TABLE IF NOT EXISTS user_devices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name         VARCHAR(255),
  device_fingerprint  VARCHAR(255) UNIQUE NOT NULL,
  device_type         VARCHAR(50) CHECK (device_type IN ('mobile', 'web', 'tablet')),
  os_version          VARCHAR(100),
  app_version         VARCHAR(50),
  trusted             BOOLEAN DEFAULT FALSE,
  trust_granted_at    TIMESTAMP,
  last_seen_at        TIMESTAMP,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_devices_trusted ON user_devices(trusted) WHERE trusted = TRUE;

COMMENT ON TABLE user_devices IS 'Registered devices for users — critical for mobile field agent trust chain';
COMMENT ON COLUMN user_devices.device_fingerprint IS 'Unique device identifier used in SHA-256 hash computation';
COMMENT ON COLUMN user_devices.trusted IS 'Only trusted devices may submit evidence capsules';
