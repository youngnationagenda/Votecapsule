-- ============================================================
-- VoteCapsule™ — Migration 168: Make campaigns.candidate_id nullable
--
-- Root cause: Party admins create campaigns on behalf of candidates
-- but the candidate UUID is not always known at campaign creation time.
-- The column was NOT NULL which caused every campaign creation from
-- the party portal to fail with "candidateId must be a UUID".
-- ============================================================

BEGIN;

ALTER TABLE campaigns
  ALTER COLUMN candidate_id DROP NOT NULL;

COMMENT ON COLUMN campaigns.candidate_id
  IS 'The candidate this campaign is run for. NULL = not yet assigned (party draft campaign).';

INSERT INTO schema_migrations (filename, executed_at)
VALUES ('168_campaigns_candidate_id_nullable.sql', NOW())
ON CONFLICT DO NOTHING;

COMMIT;
