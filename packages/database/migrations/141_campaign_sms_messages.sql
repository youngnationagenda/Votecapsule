-- ============================================================
-- VoteCapsule™ Migration 141
-- Campaign SMS Messages — performance indexes
-- Table already exists from migration 136 (Phase 14C schema)
-- Column names: recipient_phone, rendered_body, cost
-- ============================================================

BEGIN;

-- Table already exists — just ensure indexes are present
CREATE INDEX IF NOT EXISTS idx_csm_batch    ON campaign_sms_messages(batch_id);
CREATE INDEX IF NOT EXISTS idx_csm_campaign ON campaign_sms_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_csm_status   ON campaign_sms_messages(status);
CREATE INDEX IF NOT EXISTS idx_csm_phone    ON campaign_sms_messages(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_csm_provider ON campaign_sms_messages(provider_message_id);

COMMENT ON TABLE campaign_sms_messages IS 'Per-recipient SMS delivery tracking — Africa''s Talking integration';

COMMIT;