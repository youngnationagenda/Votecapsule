-- ============================================================
-- VoteCapsule™ — Notification Service Schema
-- Migration: 001_notification_schema.sql
-- Tables: notification_templates, notifications,
--         notification_deliveries, notification_devices
-- ============================================================

-- ── Notification Templates ───────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_templates (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) NOT NULL UNIQUE,
  notification_type VARCHAR(50)  NOT NULL,
  channel           VARCHAR(20)  NOT NULL
    CHECK (channel IN ('PUSH','EMAIL','SMS','IN_APP')),
  subject_template  VARCHAR(500),                   -- email subject (NULL for push/sms)
  body_template     TEXT         NOT NULL,           -- Supports {{variable}} substitution
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_templates_type_channel
  ON notification_templates (notification_type, channel)
  WHERE is_active = TRUE;

-- ── Notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID,
  user_id           UUID         NOT NULL,
  notification_type VARCHAR(50)  NOT NULL,
  channel           VARCHAR(20)  NOT NULL
    CHECK (channel IN ('PUSH','EMAIL','SMS','IN_APP')),
  title             VARCHAR(500) NOT NULL,
  body              TEXT         NOT NULL,
  data              JSONB        NOT NULL DEFAULT '{}',
  status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','SENT','DELIVERED','FAILED','READ')),
  template_id       UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  reference_id      UUID,                            -- capsuleId, workflowId, escalationId…
  reference_type    VARCHAR(100),                    -- 'CAPSULE' | 'WORKFLOW' | 'ESCALATION'
  sent_at           TIMESTAMPTZ,
  read_at           TIMESTAMPTZ,
  failed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id   ON notifications (user_id);
CREATE INDEX idx_notifications_tenant_id ON notifications (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_notifications_status    ON notifications (status) WHERE status IN ('PENDING','SENT');
CREATE INDEX idx_notifications_type      ON notifications (notification_type);
CREATE INDEX idx_notifications_reference ON notifications (reference_id, reference_type)
  WHERE reference_id IS NOT NULL;

-- ── Notification Deliveries ───────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id     UUID         NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel             VARCHAR(20)  NOT NULL,
  provider_message_id VARCHAR(500),                  -- FCM message ID / SES message ID / SNS message ID
  status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','SENT','DELIVERED','FAILED')),
  attempts            INT          NOT NULL DEFAULT 0,
  last_attempt_at     TIMESTAMPTZ,
  error_message       TEXT,
  delivered_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_deliveries_notification_id
  ON notification_deliveries (notification_id);
CREATE INDEX idx_notif_deliveries_status
  ON notification_deliveries (status) WHERE status = 'PENDING';

-- ── Notification Devices (FCM token registry) ─────────────────
-- Devices register their FCM push token here.
-- Separate from Identity Service user_devices (which tracks device trust).
CREATE TABLE IF NOT EXISTS notification_devices (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL,
  device_token VARCHAR(500) NOT NULL,
  platform     VARCHAR(20)  NOT NULL DEFAULT 'ANDROID'
    CHECK (platform IN ('ANDROID','IOS','WEB')),
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, device_token)
);

CREATE INDEX idx_notif_devices_user_id ON notification_devices (user_id)
  WHERE is_active = TRUE;

-- ── Seed: Default Notification Templates ─────────────────────
INSERT INTO notification_templates (name, notification_type, channel, subject_template, body_template) VALUES
  ('escalation_push',         'ESCALATION_CREATED',   'PUSH',   NULL,
   '🚨 {{severity}} Escalation: {{escalationType}} requires your attention for capsule {{capsuleReference}}.'),
  ('escalation_email',        'ESCALATION_CREATED',   'EMAIL',  'VoteCapsule™ Escalation: {{escalationType}}',
   'A {{severity}} escalation has been raised.\n\nType: {{escalationType}}\nCapsule: {{capsuleReference}}\nTenant: {{tenantName}}\n\nPlease log in to the Admin Portal to review.\n\nhttps://votecapsule.yna.co.ke'),
  ('validation_required_push','VALIDATION_REQUIRED',  'PUSH',   NULL,
   '📋 New evidence capsule assigned for validation — Station {{stationCode}}.'),
  ('capsule_approved_push',   'CAPSULE_APPROVED',     'PUSH',   NULL,
   '✅ Your evidence capsule for Station {{stationCode}} has been approved.'),
  ('capsule_rejected_push',   'CAPSULE_REJECTED',     'PUSH',   NULL,
   '❌ Your evidence capsule for Station {{stationCode}} was rejected. Reason: {{reason}}'),
  ('ai_review_push',          'AI_REVIEW_COMPLETED',  'PUSH',   NULL,
   '🤖 AI review complete for Station {{stationCode}}. Score: {{confidenceScore}}. Routing: {{routingDecision}}.'),
  ('workflow_failed_push',    'WORKFLOW_FAILED',      'PUSH',   NULL,
   '⚠️ Workflow failed for capsule {{capsuleReference}}. Please check the Admin Portal.'),
  ('results_published_push',  'RESULTS_PUBLISHED',   'PUSH',   NULL,
   '📢 Results for {{positionName}} at Station {{stationCode}} have been published.'),
  ('security_alert_email',    'SECURITY_ALERT',       'EMAIL',  'VoteCapsule™ Security Alert',
   'A security event has been detected on your account.\n\nEvent: {{eventDescription}}\nTime: {{eventTime}}\nIP: {{ipAddress}}\n\nIf this was not you, please contact your administrator immediately.'),
  ('assignment_push',         'ASSIGNMENT_RECEIVED',  'PUSH',   NULL,
   '📌 New assignment: {{electionName}} at Station {{stationCode}}. Tap to view details.')
ON CONFLICT (name) DO NOTHING;
