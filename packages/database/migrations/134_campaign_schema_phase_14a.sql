-- ============================================================
-- VoteCapsule™ — Campaign Manager Schema Phase 14A
-- Migration: 134_campaign_schema_phase_14a.sql
--
-- Tables: campaigns, campaign_events, campaign_event_capsules,
--         campaign_tasks, campaign_teams, campaign_team_members,
--         campaign_volunteers
--
-- Campaign service prefix: campaign_*
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 131: CAMPAIGNS
-- Core campaign entity tied to a candidate + election
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id           UUID         NOT NULL,
    candidate_id        UUID         NOT NULL,
    election_id         UUID         NOT NULL,
    party_id            UUID,
    name                VARCHAR(300) NOT NULL,
    description         TEXT,
    status              VARCHAR(30)  NOT NULL DEFAULT 'created',
                        -- created | planning | active | suspended | closed | audited | archived
    campaign_start_date DATE,
    campaign_end_date   DATE,
    headquarters        VARCHAR(500),
    headquarters_lat    DECIMAL(10,7),
    headquarters_lng    DECIMAL(10,7),
    county_code         CHAR(3),
    constituency_code   CHAR(3),
    ward_code           CHAR(4),
    target_wards        JSONB        NOT NULL DEFAULT '[]',   -- array of ward_codes targeted
    goals               JSONB        NOT NULL DEFAULT '{}',
    created_by          UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_camp_tenant      ON campaigns(tenant_id);
CREATE INDEX idx_camp_candidate   ON campaigns(candidate_id);
CREATE INDEX idx_camp_election    ON campaigns(election_id);
CREATE INDEX idx_camp_party       ON campaigns(party_id);
CREATE INDEX idx_camp_status      ON campaigns(status);

-- ─────────────────────────────────────────────────────────────
-- 132: CAMPAIGN EVENTS
-- Rallies, meetings, door-to-door drives, etc.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_events (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL,
    event_name          VARCHAR(300) NOT NULL,
    event_type          VARCHAR(50)  NOT NULL,
                        -- RALLY | MEETING | DOOR_TO_DOOR | PRESS_CONFERENCE | DEBATE | FUNDRAISER | OTHER
    event_category      VARCHAR(50)  NOT NULL DEFAULT 'CAMPAIGN',
                        -- CAMPAIGN | FUNDRAISING | MEDIA | INTERNAL
    start_time          TIMESTAMPTZ  NOT NULL,
    end_time            TIMESTAMPTZ  NOT NULL,
    venue_name          VARCHAR(300),
    venue_address       TEXT,
    lat                 DECIMAL(10,7),
    lng                 DECIMAL(10,7),
    county_code         CHAR(3),
    constituency_code   CHAR(3),
    ward_id             UUID,
    ward_code           CHAR(4),
    expected_attendance INT          NOT NULL DEFAULT 0,
    actual_attendance   INT,
    coordinator_id      UUID,                                  -- user_id of lead coordinator
    -- Requirements (logistics)
    requires_security   BOOLEAN      NOT NULL DEFAULT FALSE,
    requires_transport  BOOLEAN      NOT NULL DEFAULT FALSE,
    requires_pa_system  BOOLEAN      NOT NULL DEFAULT FALSE,
    requires_stage      BOOLEAN      NOT NULL DEFAULT FALSE,
    requires_tents      BOOLEAN      NOT NULL DEFAULT FALSE,
    requires_chairs     BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Permit
    permit_required     BOOLEAN      NOT NULL DEFAULT FALSE,
    permit_number       VARCHAR(100),
    permit_issued_date  DATE,
    permit_authority    VARCHAR(200),
    -- Budget estimate
    budget_estimate     DECIMAL(15,2) NOT NULL DEFAULT 0,
    status              VARCHAR(30)  NOT NULL DEFAULT 'scheduled',
                        -- scheduled | confirmed | in_progress | completed | cancelled | postponed
    notes               TEXT,
    created_by          UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ce_campaign    ON campaign_events(campaign_id);
CREATE INDEX idx_ce_tenant      ON campaign_events(tenant_id);
CREATE INDEX idx_ce_start_time  ON campaign_events(start_time);
CREATE INDEX idx_ce_ward        ON campaign_events(ward_code);
CREATE INDEX idx_ce_coordinator ON campaign_events(coordinator_id);
CREATE INDEX idx_ce_status      ON campaign_events(status);

-- ─────────────────────────────────────────────────────────────
-- 133: CAMPAIGN EVENT CAPSULES
-- Post-event evidence submission
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_event_capsules (
    id                      UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id                UUID         NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
    campaign_id             UUID         NOT NULL,
    tenant_id               UUID         NOT NULL,
    submitted_by            UUID         NOT NULL,
    -- GPS verification
    submission_lat          DECIMAL(10,7),
    submission_lng          DECIMAL(10,7),
    gps_distance_metres     INT,
    gps_verified            BOOLEAN      NOT NULL DEFAULT FALSE,
    gps_flag                BOOLEAN      NOT NULL DEFAULT FALSE, -- TRUE if >500 metres
    -- Attendance report
    attendance_count        INT          NOT NULL DEFAULT 0,
    attendance_notes        TEXT,
    -- Expenditure breakdown (JSONB: category → amount)
    expenditure_breakdown   JSONB        NOT NULL DEFAULT '{}',
    total_expenditure       DECIMAL(15,2) NOT NULL DEFAULT 0,
    -- Materials used
    materials_used          JSONB        NOT NULL DEFAULT '[]',
    -- Media evidence
    photo_media_ids         UUID[]       NOT NULL DEFAULT '{}',
    video_media_ids         UUID[]       NOT NULL DEFAULT '{}',
    -- Verification workflow
    verification_status     VARCHAR(30)  NOT NULL DEFAULT 'pending',
                            -- pending | approved | rejected | flagged
    reviewed_by             UUID,
    reviewed_at             TIMESTAMPTZ,
    review_notes            TEXT,
    submitted_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cec_event      ON campaign_event_capsules(event_id);
CREATE INDEX idx_cec_campaign   ON campaign_event_capsules(campaign_id);
CREATE INDEX idx_cec_tenant     ON campaign_event_capsules(tenant_id);
CREATE INDEX idx_cec_submitted  ON campaign_event_capsules(submitted_by);

-- ─────────────────────────────────────────────────────────────
-- 134: CAMPAIGN TASKS
-- Task management with dependency tracking
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_tasks (
    id                          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id                 UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    event_id                    UUID         REFERENCES campaign_events(id) ON DELETE SET NULL,
    tenant_id                   UUID         NOT NULL,
    title                       VARCHAR(300) NOT NULL,
    description                 TEXT,
    priority                    VARCHAR(20)  NOT NULL DEFAULT 'medium',
                                -- low | medium | high | critical
    assigned_to                 UUID,                           -- user_id
    assigned_to_name            VARCHAR(200),
    due_date                    TIMESTAMPTZ,
    status                      VARCHAR(30)  NOT NULL DEFAULT 'todo',
                                -- todo | in_progress | blocked | done | cancelled
    completion_evidence_media_id UUID,
    completion_notes            TEXT,
    dependencies                UUID[]       NOT NULL DEFAULT '{}', -- array of task UUIDs
    ward_code                   CHAR(4),
    county_code                 CHAR(3),
    constituency_code           CHAR(3),
    completed_at                TIMESTAMPTZ,
    created_by                  UUID,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ct_campaign    ON campaign_tasks(campaign_id);
CREATE INDEX idx_ct_tenant      ON campaign_tasks(tenant_id);
CREATE INDEX idx_ct_assigned    ON campaign_tasks(assigned_to);
CREATE INDEX idx_ct_status      ON campaign_tasks(status);
CREATE INDEX idx_ct_due_date    ON campaign_tasks(due_date);
CREATE INDEX idx_ct_ward        ON campaign_tasks(ward_code);

-- ─────────────────────────────────────────────────────────────
-- 135: CAMPAIGN TEAMS
-- Team structure per campaign scoped to geography
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_teams (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL,
    team_name           VARCHAR(200) NOT NULL,
    team_type           VARCHAR(50)  NOT NULL DEFAULT 'GENERAL',
                        -- GENERAL | WARD | CONSTITUENCY | COUNTY | YOUTH | WOMEN | MEDIA | SECURITY
    team_leader_id      UUID,                                  -- user_id
    team_leader_name    VARCHAR(200),
    county_code         CHAR(3),
    constituency_code   CHAR(3),
    ward_code           CHAR(4),
    description         TEXT,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by          UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cteam_campaign ON campaign_teams(campaign_id);
CREATE INDEX idx_cteam_tenant   ON campaign_teams(tenant_id);
CREATE INDEX idx_cteam_ward     ON campaign_teams(ward_code);

-- ─────────────────────────────────────────────────────────────
-- 136: CAMPAIGN TEAM MEMBERS
-- Membership assignments per team
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_team_members (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id             UUID         NOT NULL REFERENCES campaign_teams(id) ON DELETE CASCADE,
    campaign_id         UUID         NOT NULL,
    tenant_id           UUID         NOT NULL,
    user_id             UUID         NOT NULL,
    user_name           VARCHAR(200),
    user_email          VARCHAR(200),
    campaign_role       VARCHAR(50)  NOT NULL DEFAULT 'MEMBER',
                        -- MEMBER | COORDINATOR | WARD_COORDINATOR | DRIVER | SECURITY | MEDIA
    county_code         CHAR(3),
    constituency_code   CHAR(3),
    ward_code           CHAR(4),
    status              VARCHAR(20)  NOT NULL DEFAULT 'active',
                        -- active | inactive | suspended
    joined_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    left_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);
CREATE INDEX idx_ctm_team       ON campaign_team_members(team_id);
CREATE INDEX idx_ctm_campaign   ON campaign_team_members(campaign_id);
CREATE INDEX idx_ctm_user       ON campaign_team_members(user_id);
CREATE INDEX idx_ctm_ward       ON campaign_team_members(ward_code);

-- ─────────────────────────────────────────────────────────────
-- 137: CAMPAIGN VOLUNTEERS
-- Volunteer registry per campaign
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_volunteers (
    id                      UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id             UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id               UUID         NOT NULL,
    first_name              VARCHAR(100) NOT NULL,
    last_name               VARCHAR(100) NOT NULL,
    phone                   VARCHAR(20)  NOT NULL,
    email                   VARCHAR(200),
    national_id             VARCHAR(30),
    county_code             CHAR(3),
    constituency_code       CHAR(3),
    ward_code               CHAR(4),
    assigned_coordinator_id UUID,
    skills                  TEXT[]       NOT NULL DEFAULT '{}',
    availability            JSONB        NOT NULL DEFAULT '{}',  -- {days: [], hours: {from, to}}
    training_status         VARCHAR(30)  NOT NULL DEFAULT 'not_trained',
                            -- not_trained | in_training | trained | certified
    training_completed_at   TIMESTAMPTZ,
    -- Engagement metrics
    events_attended         INT          NOT NULL DEFAULT 0,
    tasks_completed         INT          NOT NULL DEFAULT 0,
    -- Consent tracking
    consent_given           BOOLEAN      NOT NULL DEFAULT FALSE,
    consent_date            DATE,
    consent_method          VARCHAR(50),                        -- VERBAL | WRITTEN | DIGITAL
    -- Status
    status                  VARCHAR(20)  NOT NULL DEFAULT 'active',
                            -- active | inactive | removed
    notes                   TEXT,
    registered_by           UUID,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cv_campaign    ON campaign_volunteers(campaign_id);
CREATE INDEX idx_cv_tenant      ON campaign_volunteers(tenant_id);
CREATE INDEX idx_cv_ward        ON campaign_volunteers(ward_code);
CREATE INDEX idx_cv_phone       ON campaign_volunteers(phone);
CREATE INDEX idx_cv_status      ON campaign_volunteers(status);
