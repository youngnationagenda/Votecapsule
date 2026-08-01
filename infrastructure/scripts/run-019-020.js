/**
 * Run migrations 019 (audit schema) and 020 (billing schema additions)
 * with fixes for:
 * - schema_migrations uses (filename) not (version, name)
 * - subscriptions table already exists (from migration 010)
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'votecapsule',
  user: 'vcadmin',
  password: 'B,7BZvfuwXOxDoCjN7g8=03JfxKv3zH0',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

// Fixed SQL for migration 019 — Audit schema
// (removes the version-based schema_migrations insert, uses filename-based)
const AUDIT_SQL = `
-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    session_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(80) NOT NULL,
    resource_id UUID,
    service_name VARCHAR(50) NOT NULL,
    method VARCHAR(10),
    endpoint VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    device_id UUID,
    previous_state JSONB,
    new_state JSONB,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    error_code VARCHAR(50),
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT audit_logs_action_not_empty CHECK (action <> ''),
    CONSTRAINT audit_logs_valid_status CHECK (status IN ('success', 'failure', 'denied', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_service ON audit_logs (service_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs (status) WHERE status != 'success';
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- ============================================================
-- SECURITY EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(80) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_id UUID,
    geo_location JSONB,
    auth_method VARCHAR(30),
    login_attempt_count INTEGER,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT security_events_valid_severity CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    CONSTRAINT security_events_valid_category CHECK (category IN ('authentication', 'authorization', 'data_access', 'configuration', 'anomaly'))
);

CREATE INDEX IF NOT EXISTS idx_security_events_tenant ON security_events (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events (severity, created_at DESC) WHERE severity IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_unresolved ON security_events (resolved, created_at DESC) WHERE resolved = FALSE;

-- ============================================================
-- ACCESS LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    service_name VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    ip_address INET,
    device_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_tenant_created ON access_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_created ON access_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_endpoint ON access_logs (endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_status_code ON access_logs (status_code) WHERE status_code >= 400;

-- ============================================================
-- COMPLIANCE REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    report_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    report_data JSONB NOT NULL,
    summary TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    generated_by VARCHAR(50) NOT NULL DEFAULT 'system',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    file_key VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    CONSTRAINT compliance_reports_valid_status CHECK (status IN ('draft', 'review', 'published', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_tenant ON compliance_reports (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_type ON compliance_reports (report_type, period_end DESC);

-- ============================================================
-- SYSTEM LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(50) NOT NULL,
    log_level VARCHAR(10) NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    stack_trace TEXT,
    correlation_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT system_logs_valid_level CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'fatal'))
);

CREATE INDEX IF NOT EXISTS idx_system_logs_service_level ON system_logs (service_name, log_level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_errors ON system_logs (created_at DESC) WHERE log_level IN ('error', 'fatal');
CREATE INDEX IF NOT EXISTS idx_system_logs_correlation ON system_logs (correlation_id) WHERE correlation_id IS NOT NULL;

INSERT INTO schema_migrations (filename, executed_at) VALUES ('019_audit_schema.sql', NOW()) ON CONFLICT (filename) DO NOTHING;
`;

// Fixed SQL for migration 020 — Billing additions
// (subscriptions table already exists from migration 010 — only add NEW tables)
const BILLING_SQL = `
-- ============================================================
-- PRICING PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    currency VARCHAR(3) NOT NULL DEFAULT 'KES',
    price_monthly NUMERIC(12, 2) NOT NULL DEFAULT 0,
    price_yearly NUMERIC(12, 2) NOT NULL DEFAULT 0,
    setup_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    max_elections INTEGER,
    max_agents INTEGER,
    max_polling_stations INTEGER,
    max_capsules_per_election INTEGER,
    max_users INTEGER,
    max_storage_gb INTEGER,
    features JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pricing_plans_positive_prices CHECK (price_monthly >= 0 AND price_yearly >= 0 AND setup_fee >= 0)
);

-- ============================================================
-- LICENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    subscription_id UUID REFERENCES subscriptions(id),
    license_key VARCHAR(64) NOT NULL UNIQUE,
    license_type VARCHAR(50) NOT NULL,
    election_id UUID,
    feature_code VARCHAR(50),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    max_usage INTEGER,
    current_usage INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    CONSTRAINT licenses_valid_type CHECK (license_type IN ('election', 'feature', 'add_on'))
);

CREATE INDEX IF NOT EXISTS idx_licenses_tenant ON licenses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses (license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_subscription ON licenses (subscription_id);
CREATE INDEX IF NOT EXISTS idx_licenses_active ON licenses (is_active, valid_until) WHERE is_active = TRUE;

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    subscription_id UUID REFERENCES subscriptions(id),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    due_date DATE NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'KES',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    issued_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,
    pdf_file_key VARCHAR(500),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT invoices_valid_status CHECK (status IN ('draft', 'issued', 'paid', 'partial', 'overdue', 'void', 'refunded')),
    CONSTRAINT invoices_positive_amounts CHECK (subtotal >= 0 AND total >= 0 AND amount_paid >= 0)
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices (subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status) WHERE status IN ('issued', 'partial', 'overdue');
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices (due_date) WHERE status IN ('issued', 'partial');

-- ============================================================
-- INVOICE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    plan_id UUID REFERENCES pricing_plans(id),
    license_id UUID REFERENCES licenses(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT invoice_items_valid_type CHECK (item_type IN ('subscription', 'setup', 'overage', 'add_on', 'credit'))
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items (invoice_id);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    invoice_id UUID REFERENCES invoices(id),
    currency VARCHAR(3) NOT NULL DEFAULT 'KES',
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    payment_provider VARCHAR(50),
    provider_transaction_id VARCHAR(255),
    provider_response JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    refunded_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    refunded_at TIMESTAMPTZ,
    refund_reason TEXT,
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    CONSTRAINT payments_valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'disputed')),
    CONSTRAINT payments_valid_method CHECK (payment_method IN ('mpesa', 'card', 'bank_transfer', 'manual')),
    CONSTRAINT payments_positive_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_payments_provider_tx ON payments (provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;

-- ============================================================
-- PAYMENT METHODS
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    method_type VARCHAR(30) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    label VARCHAR(100),
    last_four VARCHAR(4),
    provider_token VARCHAR(500),
    phone_number VARCHAR(20),
    card_brand VARCHAR(20),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    bank_name VARCHAR(100),
    account_number_masked VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payment_methods_valid_type CHECK (method_type IN ('mpesa', 'card', 'bank_account'))
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant ON payment_methods (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods (tenant_id, is_default) WHERE is_default = TRUE;

-- ============================================================
-- USAGE RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    subscription_id UUID REFERENCES subscriptions(id),
    metric VARCHAR(50) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'count',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    election_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_records_tenant_metric ON usage_records (tenant_id, metric, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_records_subscription ON usage_records (subscription_id, period_start);

-- ============================================================
-- Seed default pricing plans
-- ============================================================
INSERT INTO pricing_plans (id, name, code, description, currency, price_monthly, price_yearly, max_elections, max_agents, max_polling_stations, max_capsules_per_election, max_users, max_storage_gb, features, sort_order)
VALUES
    (gen_random_uuid(), 'Starter', 'starter', 'For small organizations monitoring a single election', 'KES', 5000, 50000, 1, 50, 500, 5000, 10, 5, '["basic_reporting", "evidence_capture"]', 1),
    (gen_random_uuid(), 'Professional', 'professional', 'For political parties and medium organizations', 'KES', 25000, 250000, 5, 500, 5000, 50000, 50, 50, '["basic_reporting", "evidence_capture", "ai_verification", "real_time_reporting", "api_access"]', 2),
    (gen_random_uuid(), 'Enterprise', 'enterprise', 'For election authorities and large organizations', 'KES', 100000, 1000000, NULL, NULL, NULL, NULL, NULL, 500, '["basic_reporting", "evidence_capture", "ai_verification", "real_time_reporting", "api_access", "custom_integrations", "dedicated_support", "sla_guarantee"]', 3),
    (gen_random_uuid(), 'Platform', 'platform', 'Vote Capsule Technologies internal — unlimited', 'KES', 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, '["all"]', 99)
ON CONFLICT DO NOTHING;

INSERT INTO schema_migrations (filename, executed_at) VALUES ('020_billing_schema.sql', NOW()) ON CONFLICT (filename) DO NOTHING;
`;

async function run() {
  await client.connect();
  console.log('Connected to Aurora.\n');

  // Run audit migration
  console.log('Running 019_audit_schema.sql...');
  try {
    await client.query('BEGIN');
    await client.query(AUDIT_SQL);
    await client.query('COMMIT');
    console.log('  ✅ 019_audit_schema.sql — DONE');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('  ❌ FAILED:', e.message.slice(0, 300));
  }

  // Run billing migration
  console.log('Running 020_billing_schema.sql...');
  try {
    await client.query('BEGIN');
    await client.query(BILLING_SQL);
    await client.query('COMMIT');
    console.log('  ✅ 020_billing_schema.sql — DONE');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('  ❌ FAILED:', e.message.slice(0, 300));
  }

  // Verify
  console.log('\nVerifying tables:');
  const tables = ['audit_logs', 'security_events', 'access_logs', 'compliance_reports', 'system_logs',
                  'pricing_plans', 'licenses', 'invoices', 'payments', 'payment_methods', 'usage_records'];
  for (const t of tables) {
    try {
      const r = await client.query(`SELECT COUNT(*) as c FROM ${t}`);
      console.log(`  ✅ ${t}: ${r.rows[0].c} rows`);
    } catch (e) {
      console.log(`  ❌ ${t}: ${e.message.slice(0, 60)}`);
    }
  }

  await client.end();
  console.log('\nDone.');
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
