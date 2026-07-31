-- Vote Capsule™ Migration 002
-- Creates the user_profiles table
-- Domain: Foundation / Identity

CREATE TABLE IF NOT EXISTS user_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name  VARCHAR(100),
  last_name   VARCHAR(100),
  phone       VARCHAR(50),
  avatar_url  TEXT,
  language    VARCHAR(10) DEFAULT 'en',
  timezone    VARCHAR(50) DEFAULT 'Africa/Nairobi',
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

COMMENT ON TABLE user_profiles IS 'Extended profile information for platform users';
COMMENT ON COLUMN user_profiles.timezone IS 'Default timezone — Africa/Nairobi for Kenya';
