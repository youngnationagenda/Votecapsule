-- ============================================================
-- VoteCapsule™ — Campaign Manager Schema Phase 14C
-- Migration: 136_campaign_schema_phase_14c.sql
--
-- Tables: sms_templates, sms_batches, sms_messages, sms_consents,
--         campaign_incidents
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 157: CAMPAIGN SMS TEMPLATES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_sms_templates (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL,
    template_name       VARCHAR(200) NOT NULL,
    body                TEXT         NOT NULL,                 -- supports {{first_name}}, {{ward}}, etc.
    variables           TEXT[]       NOT NULL DEFAULT '{}',   -- extracted variable names
    category            VARCHAR(50)  NOT NULL DEFAULT 'general',
                        -- general | event_reminder | mobilization | results | urgent
    char_count          INT          GENERATED ALWAYS AS (LENGTH(body)) STORED,
    sms_count           INT          GENERATED ALWAYS AS (CEIL(LENGTH(body)::numeric / 160)) STORED,
    approval_status     VARCHAR(20)  NOT NULL DEFAULT 'draft',
                        -- draft | pending_approval | approved | rejected
    approved_by         UUID,
    approved_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    usage_count         INT          NOT NULL DEFAULT 0,
    created_by          UUID         NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cst_campaign   ON campaign_sms_templates(campaign_id);
CREATE INDEX idx_cst_tenant     ON campaign_sms_templates(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- 158: CAMPAIGN SMS BATCHES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_sms_batches (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL,
    template_id         UUID         REFERENCES campaign_sms_templates(id),
    batch_name          VARCHAR(200),
    -- Audience filter (JSONB: {ward_codes: [], roles: [], team_ids: []})
    audience_filter     JSONB        NOT NULL DEFAULT '{}',
    -- Scheduling
    scheduled_at        TIMESTAMPTZ,
    sent_at             TIMESTAMPTZ,
    -- Delivery stats
    total_recipients    INT          NOT NULL DEFAULT 0,
    sent_count          INT          NOT NULL DEFAULT 0,
    delivered_count     INT          NOT NULL DEFAULT 0,
    failed_count        INT          NOT NULL DEFAULT 0,
    pending_count       INT          NOT NULL DEFAULT 0,
    delivery_rate       DECIMAL(5,2) GENERATED ALWAYS AS
                        (CASE WHEN sent_count > 0
                            THEN ROUND((delivered_count::numeric / sent_count) * 100, 2)
                            ELSE 0 END) STORED,
    -- Cost
    cost_per_sms        DECIMAL(8,4) NOT NULL DEFAULT 1.0,    -- KES per SMS
    total_cost          DECIMAL(12,2) GENERATED ALWAYS AS
                        (ROUND(sent_count::numeric * cost_per_sms, 2)) STORED,
    -- Provider
    provider            VARCHAR(30)  NOT NULL DEFAULT 'africas_talking',
                        -- africas_talking | safaricom
    provider_batch_id   VARCHAR(200),
    sender_id           VARCHAR(50),
    status              VARCHAR(20)  NOT NULL DEFAULT 'draft',
                        -- draft | queued | processing | completed | failed | cancelled
    message_content     TEXT,                                  -- final rendered message (no variables)
    created_by          UUID         NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_csb_campaign   ON campaign_sms_batches(campaign_id);
CREATE INDEX idx_csb_tenant     ON campaign_sms_batches(tenant_id);
CREATE INDEX idx_csb_status     ON campaign_sms_batches(status);

-- ─────────────────────────────────────────────────────────────
-- 159: CAMPAIGN SMS MESSAGES
-- Individual message tracking per recipient
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_sms_messages (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id            UUID         NOT NULL REFERENCES campaign_sms_batches(id) ON DELETE CASCADE,
    campaign_id         UUID         NOT NULL,
    tenant_id           UUID         NOT NULL,
    recipient_phone     VARCHAR(20)  NOT NULL,
    recipient_name      VARCHAR(200),
    recipient_user_id   UUID,
    rendered_body       TEXT         NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'queued',
                        -- queued | sent | delivered | failed | rejected
    provider_message_id VARCHAR(200),
    failure_reason      VARCHAR(300),
    cost                DECIMAL(8,4),
    sent_at             TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_csm_batch      ON campaign_sms_messages(batch_id);
CREATE INDEX idx_csm_campaign   ON campaign_sms_messages(campaign_id);
CREATE INDEX idx_csm_phone      ON campaign_sms_messages(recipient_phone);
CREATE INDEX idx_csm_status     ON campaign_sms_messages(status);

-- ─────────────────────────────────────────────────────────────
-- 160: CAMPAIGN SMS CONSENTS
-- Opt-in/out registry per phone number
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_sms_consents (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL,
    phone               VARCHAR(20)  NOT NULL,
    user_id             UUID,
    consent_given       BOOLEAN      NOT NULL DEFAULT TRUE,
    consent_method      VARCHAR(30)  NOT NULL DEFAULT 'opt_in',
                        -- opt_in | sign_up_form | event_registration | manual
    consent_date        DATE         NOT NULL DEFAULT CURRENT_DATE,
    opted_out           BOOLEAN      NOT NULL DEFAULT FALSE,
    opt_out_date        DATE,
    opt_out_reason      VARCHAR(200),
    preferences         JSONB        NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(campaign_id, phone)
);
CREATE INDEX idx_csc_campaign   ON campaign_sms_consents(campaign_id);
CREATE INDEX idx_csc_phone      ON campaign_sms_consents(phone);

-- ─────────────────────────────────────────────────────────────
-- 161: CAMPAIGN INCIDENTS
-- Security, violence, rigging, and logistics incidents
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_incidents (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL,
    event_id            UUID         REFERENCES campaign_events(id),
    incident_number     VARCHAR(30)  UNIQUE,                   -- INC-2027-0001
    category            VARCHAR(50)  NOT NULL,
                        -- SECURITY | VIOLENCE | VANDALISM | LOGISTICS | MEDICAL | WEATHER | OTHER
    incident_type       VARCHAR(100) NOT NULL,
    severity            VARCHAR(20)  NOT NULL DEFAULT 'low',
                        -- low | medium | high | critical
    title               VARCHAR(300) NOT NULL,
    description         TEXT         NOT NULL,
    lat                 DECIMAL(10,7),
    lng                 DECIMAL(10,7),
    location_name       VARCHAR(200),
    county_code         CHAR(3),
    constituency_code   CHAR(3),
    ward_code           CHAR(4),
    reported_by         UUID         NOT NULL,
    reporter_name       VARCHAR(200),
    assigned_to         UUID,
    -- Escalation
    escalated           BOOLEAN      NOT NULL DEFAULT FALSE,
    escalated_to        UUID,
    escalated_at        TIMESTAMPTZ,
    escalation_reason   TEXT,
    -- Resolution
    status              VARCHAR(20)  NOT NULL DEFAULT 'open',
                        -- open | investigating | escalated | resolved | closed
    resolution          TEXT,
    resolved_by         UUID,
    resolved_at         TIMESTAMPTZ,
    -- Evidence
    media_ids           UUID[]       NOT NULL DEFAULT '{}',
    incident_date       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    notes               TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ci_campaign    ON campaign_incidents(campaign_id);
CREATE INDEX idx_ci_tenant      ON campaign_incidents(tenant_id);
CREATE INDEX idx_ci_severity    ON campaign_incidents(severity);
CREATE INDEX idx_ci_status      ON campaign_incidents(status);
CREATE INDEX idx_ci_ward        ON campaign_incidents(ward_code);
CREATE INDEX idx_ci_date        ON campaign_incidents(incident_date);
