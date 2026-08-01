-- Vote Capsule™ — Audit Schema
-- Migration: 019_audit_schema.sql
-- Purpose: Compliance logging, security events, access audit trail
-- Spec: V12 Chapter 3 (Audit domain), V13 Chapter 8 (Validation APIs audit)

BEGIN;

-- ============================================================
-- AUDIT LOGS — Main compliance event trail
-- Every significant platform action is logged here
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    session_id UUID,

    -- What happened
    action VARCHAR(100) NOT NULL,          -- e.g. 'evidence.capsule.submitted', 'user.login', 'candidate.approved'
    resource_type VARCHAR(80) NOT NULL,    -- e.g. 'evidence_capsule', 'user', 'election'
    resource_id UUID,                      -- ID of affected resource

    -- Context
    service_name VARCHAR(50) NOT NULL,     -- originating service: identity, evidence, trust, etc.
    method VARCHAR(10),                    -- HTTP method: GET, POST, PUT, DELETE
    endpoint VARCHAR(255),                 -- API endpoint path
    ip_address INET,
    user_agent TEXT,
    device_id UUID,

    -- Change details
    previous_state JSONB,                  -- snapshot before change (for mutations)
    new_state JSONB,                       -- snapshot after change
    metadata JSONB DEFAULT '{}',           -- additional context (geo, election_id, etc.)

    -- Result
    status VARCHAR(20) NOT NULL DEFAULT 'success',  -- success, failure, denied, error
    error_code VARCHAR(50),
    error_message TEXT,

    -- Timing
    duration_ms INTEGER,                   -- request duration
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Immutability: no updated_at — audit logs are append-only
    -- Retention: partitioned by month for lifecycle management
    CONSTRAINT audit_logs_action_not_empty CHECK (action <> ''),
    CONSTRAINT audit_logs_valid_status CHECK (status IN ('success', 'failure', 'denied', 'error'))
);

-- Indexes for common query patterns
CREATE INDEX idx_audit_logs_tenant_created ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_created ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action, created_at DESC);
CREATE INDEX idx_audit_logs_service ON audit_logs (service_name, created_at DESC);
CREATE INDEX idx_audit_logs_status ON audit_logs (status) WHERE status != 'success';
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- ============================================================
-- SECURITY EVENTS — Elevated security-relevant events
-- Login attempts, MFA, privilege escalation, suspicious activity
-- ============================================================
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),

    -- Event classification
    event_type VARCHAR(80) NOT NULL,       -- login_success, login_failure, mfa_challenge, privilege_escalation, suspicious_activity
    severity VARCHAR(20) NOT NULL DEFAULT 'info',  -- info, low, medium, high, critical
    category VARCHAR(50) NOT NULL,         -- authentication, authorization, data_access, configuration, anomaly

    -- Details
    description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_id UUID,
    geo_location JSONB,                    -- {country, city, lat, lng} from IP geolocation

    -- For login events
    auth_method VARCHAR(30),               -- password, mfa_totp, biometric, sso
    login_attempt_count INTEGER,

    -- Resolution
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,

    -- Context
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT security_events_valid_severity CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    CONSTRAINT security_events_valid_category CHECK (category IN ('authentication', 'authorization', 'data_access', 'configuration', 'anomaly'))
);

CREATE INDEX idx_security_events_tenant ON security_events (tenant_id, created_at DESC);
CREATE INDEX idx_security_events_user ON security_events (user_id, created_at DESC);
CREATE INDEX idx_security_events_severity ON security_events (severity, created_at DESC) WHERE severity IN ('high', 'critical');
CREATE INDEX idx_security_events_type ON security_events (event_type, created_at DESC);
CREATE INDEX idx_security_events_unresolved ON security_events (resolved, created_at DESC) WHERE resolved = FALSE;

-- ============================================================
-- ACCESS LOGS — API access patterns for compliance reporting
-- Lighter than audit_logs: tracks access frequency, not content
-- ============================================================
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),

    service_name VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,

    -- Response
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,

    -- Client
    ip_address INET,
    device_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_access_logs_tenant_created ON access_logs (tenant_id, created_at DESC);
CREATE INDEX idx_access_logs_user_created ON access_logs (user_id, created_at DESC);
CREATE INDEX idx_access_logs_endpoint ON access_logs (endpoint, created_at DESC);
CREATE INDEX idx_access_logs_status_code ON access_logs (status_code) WHERE status_code >= 400;

-- ============================================================
-- COMPLIANCE REPORTS — Generated compliance summaries
-- Periodic reports for regulatory and internal use
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),

    report_type VARCHAR(50) NOT NULL,      -- access_review, security_summary, data_retention, incident_report
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Period covered
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,

    -- Content
    report_data JSONB NOT NULL,            -- structured report content
    summary TEXT,                          -- human-readable summary

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, review, published, archived
    generated_by VARCHAR(50) NOT NULL DEFAULT 'system',  -- system, manual
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,

    -- Storage
    file_key VARCHAR(500),                 -- S3 key if exported as PDF

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    CONSTRAINT compliance_reports_valid_status CHECK (status IN ('draft', 'review', 'published', 'archived'))
);

CREATE INDEX idx_compliance_reports_tenant ON compliance_reports (tenant_id, created_at DESC);
CREATE INDEX idx_compliance_reports_type ON compliance_reports (report_type, period_end DESC);

-- ============================================================
-- SYSTEM LOGS — Platform-level operational events
-- Service health, deployments, configuration changes
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    service_name VARCHAR(50) NOT NULL,
    log_level VARCHAR(10) NOT NULL DEFAULT 'info',  -- debug, info, warn, error, fatal

    message TEXT NOT NULL,
    stack_trace TEXT,

    -- Context
    correlation_id UUID,                   -- trace across services
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT system_logs_valid_level CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'fatal'))
);

CREATE INDEX idx_system_logs_service_level ON system_logs (service_name, log_level, created_at DESC);
CREATE INDEX idx_system_logs_errors ON system_logs (created_at DESC) WHERE log_level IN ('error', 'fatal');
CREATE INDEX idx_system_logs_correlation ON system_logs (correlation_id) WHERE correlation_id IS NOT NULL;

-- Record migration
INSERT INTO schema_migrations (version, name, executed_at)
VALUES (19, '019_audit_schema', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
