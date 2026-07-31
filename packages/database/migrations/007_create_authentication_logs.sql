-- Vote Capsule™ Migration 007
-- Creates authentication_logs table
-- Domain: Foundation / Identity / Audit

CREATE TABLE IF NOT EXISTS authentication_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type      VARCHAR(100) CHECK (event_type IN (
                    'login', 'logout', 'mfa_success', 'mfa_failure',
                    'password_reset', 'token_refresh', 'account_locked',
                    'device_trusted', 'device_removed'
                  )),
  ip_address      INET,
  user_agent      TEXT,
  device_id       UUID REFERENCES user_devices(id) ON DELETE SET NULL,
  success         BOOLEAN NOT NULL,
  failure_reason  TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON authentication_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON authentication_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON authentication_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_success ON authentication_logs(success) WHERE success = FALSE;

COMMENT ON TABLE authentication_logs IS 'Immutable authentication audit trail — every login/logout event recorded';
