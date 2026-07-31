-- Vote Capsule™ Migration 006
-- Creates invitations table
-- Domain: Foundation / Identity

CREATE TABLE IF NOT EXISTS invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL,
  tenant_id   UUID,
  role_id     UUID REFERENCES roles(id),
  invited_by  UUID REFERENCES users(id),
  token       VARCHAR(255) UNIQUE NOT NULL,
  status      VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at  TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

COMMENT ON TABLE invitations IS 'Platform user invitation workflow — controlled onboarding';
COMMENT ON COLUMN invitations.token IS 'Secure random token sent via email for invitation acceptance';
