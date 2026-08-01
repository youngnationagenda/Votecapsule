-- Vote Capsule™ — Billing Schema
-- Migration: 020_billing_schema.sql
-- Purpose: Subscriptions, licensing, invoices, payments for multi-tenant SaaS billing
-- Spec: V12 Chapter 3 (Billing domain), V13 Chapter 12 (Billing APIs), V10 Phase 7

BEGIN;

-- ============================================================
-- PRICING PLANS — Available subscription tiers
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,            -- e.g. 'Starter', 'Professional', 'Enterprise'
    code VARCHAR(50) NOT NULL UNIQUE,      -- e.g. 'starter', 'professional', 'enterprise'
    description TEXT,

    -- Pricing
    currency VARCHAR(3) NOT NULL DEFAULT 'KES',  -- ISO 4217
    price_monthly NUMERIC(12, 2) NOT NULL DEFAULT 0,
    price_yearly NUMERIC(12, 2) NOT NULL DEFAULT 0,
    setup_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,

    -- Limits
    max_elections INTEGER,                 -- NULL = unlimited
    max_agents INTEGER,
    max_polling_stations INTEGER,
    max_capsules_per_election INTEGER,
    max_users INTEGER,
    max_storage_gb INTEGER,

    -- Features (JSON array of feature codes)
    features JSONB NOT NULL DEFAULT '[]',  -- e.g. ["ai_verification", "real_time_reporting", "api_access"]

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,  -- visible on pricing page
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pricing_plans_positive_prices CHECK (price_monthly >= 0 AND price_yearly >= 0 AND setup_fee >= 0)
);

-- ============================================================
-- SUBSCRIPTIONS — Tenant subscription to a pricing plan
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    plan_id UUID NOT NULL REFERENCES pricing_plans(id),

    -- Billing cycle
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',  -- monthly, yearly, custom
    billing_anchor_day INTEGER NOT NULL DEFAULT 1,          -- day of month billing recurs

    -- Period
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_ends_at TIMESTAMPTZ,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- trial, active, past_due, cancelled, suspended, expired

    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,

    -- Usage overrides (NULL = use plan defaults)
    max_elections_override INTEGER,
    max_agents_override INTEGER,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    version INTEGER NOT NULL DEFAULT 1,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT subscriptions_valid_status CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'suspended', 'expired')),
    CONSTRAINT subscriptions_valid_cycle CHECK (billing_cycle IN ('monthly', 'yearly', 'custom'))
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions (tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (status) WHERE status NOT IN ('cancelled', 'expired');
CREATE INDEX idx_subscriptions_period_end ON subscriptions (current_period_end) WHERE status = 'active';

-- ============================================================
-- LICENSES — Per-election or per-feature license keys
-- ============================================================
CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    subscription_id UUID REFERENCES subscriptions(id),

    license_key VARCHAR(64) NOT NULL UNIQUE,  -- generated unique key
    license_type VARCHAR(50) NOT NULL,        -- election, feature, add_on

    -- Scope
    election_id UUID,                      -- if election-scoped
    feature_code VARCHAR(50),              -- if feature-scoped

    -- Validity
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,               -- NULL = perpetual (within subscription)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Limits
    max_usage INTEGER,                     -- NULL = unlimited within license period
    current_usage INTEGER NOT NULL DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    CONSTRAINT licenses_valid_type CHECK (license_type IN ('election', 'feature', 'add_on'))
);

CREATE INDEX idx_licenses_tenant ON licenses (tenant_id);
CREATE INDEX idx_licenses_key ON licenses (license_key);
CREATE INDEX idx_licenses_subscription ON licenses (subscription_id);
CREATE INDEX idx_licenses_active ON licenses (is_active, valid_until) WHERE is_active = TRUE;

-- ============================================================
-- INVOICES — Generated billing documents
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    subscription_id UUID REFERENCES subscriptions(id),

    invoice_number VARCHAR(50) NOT NULL UNIQUE,  -- e.g. 'VC-2026-001234'

    -- Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    due_date DATE NOT NULL,

    -- Amounts
    currency VARCHAR(3) NOT NULL DEFAULT 'KES',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,   -- e.g. 0.16 for 16% VAT
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount_due NUMERIC(12, 2) NOT NULL DEFAULT 0,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, issued, paid, partial, overdue, void, refunded

    -- Dates
    issued_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,

    -- PDF
    pdf_file_key VARCHAR(500),             -- S3 key for generated PDF

    -- Notes
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT invoices_valid_status CHECK (status IN ('draft', 'issued', 'paid', 'partial', 'overdue', 'void', 'refunded')),
    CONSTRAINT invoices_positive_amounts CHECK (subtotal >= 0 AND total >= 0 AND amount_paid >= 0)
);

CREATE INDEX idx_invoices_tenant ON invoices (tenant_id, created_at DESC);
CREATE INDEX idx_invoices_subscription ON invoices (subscription_id);
CREATE INDEX idx_invoices_status ON invoices (status) WHERE status IN ('issued', 'partial', 'overdue');
CREATE INDEX idx_invoices_due_date ON invoices (due_date) WHERE status IN ('issued', 'partial');

-- ============================================================
-- INVOICE ITEMS — Line items within an invoice
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

    description VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) NOT NULL,        -- subscription, setup, overage, add_on, credit

    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,        -- quantity * unit_price

    -- Reference
    plan_id UUID REFERENCES pricing_plans(id),
    license_id UUID REFERENCES licenses(id),

    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT invoice_items_valid_type CHECK (item_type IN ('subscription', 'setup', 'overage', 'add_on', 'credit'))
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);

-- ============================================================
-- PAYMENTS — Payment transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    invoice_id UUID REFERENCES invoices(id),

    -- Amount
    currency VARCHAR(3) NOT NULL DEFAULT 'KES',
    amount NUMERIC(12, 2) NOT NULL,

    -- Payment method
    payment_method VARCHAR(30) NOT NULL,   -- mpesa, card, bank_transfer, manual
    payment_provider VARCHAR(50),          -- safaricom, stripe, bank_name

    -- Provider reference
    provider_transaction_id VARCHAR(255),  -- M-Pesa receipt, Stripe charge ID, etc.
    provider_response JSONB,               -- full provider response for reconciliation

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed, refunded, disputed

    -- Dates
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,

    -- Refund tracking
    refunded_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    refunded_at TIMESTAMPTZ,
    refund_reason TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    CONSTRAINT payments_valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'disputed')),
    CONSTRAINT payments_valid_method CHECK (payment_method IN ('mpesa', 'card', 'bank_transfer', 'manual')),
    CONSTRAINT payments_positive_amount CHECK (amount > 0)
);

CREATE INDEX idx_payments_tenant ON payments (tenant_id, created_at DESC);
CREATE INDEX idx_payments_invoice ON payments (invoice_id);
CREATE INDEX idx_payments_status ON payments (status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_payments_provider_tx ON payments (provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;

-- ============================================================
-- PAYMENT METHODS — Saved payment methods per tenant
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    method_type VARCHAR(30) NOT NULL,      -- mpesa, card, bank_account
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Details (encrypted/tokenized — never store raw card numbers)
    label VARCHAR(100),                    -- user-friendly label: "M-Pesa *1234", "Visa *4242"
    last_four VARCHAR(4),                  -- last 4 digits
    provider_token VARCHAR(500),           -- tokenized reference from payment provider

    -- M-Pesa specific
    phone_number VARCHAR(20),              -- e.g. +254712345678

    -- Card specific
    card_brand VARCHAR(20),                -- visa, mastercard
    card_exp_month INTEGER,
    card_exp_year INTEGER,

    -- Bank specific
    bank_name VARCHAR(100),
    account_number_masked VARCHAR(50),

    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT payment_methods_valid_type CHECK (method_type IN ('mpesa', 'card', 'bank_account'))
);

CREATE INDEX idx_payment_methods_tenant ON payment_methods (tenant_id);
CREATE INDEX idx_payment_methods_default ON payment_methods (tenant_id, is_default) WHERE is_default = TRUE;

-- ============================================================
-- USAGE RECORDS — Track usage for overage billing
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    subscription_id UUID REFERENCES subscriptions(id),

    metric VARCHAR(50) NOT NULL,           -- capsules_submitted, ai_verifications, storage_gb, api_calls
    quantity NUMERIC(12, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'count',  -- count, gb, calls

    -- Period
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,

    -- Reference
    election_id UUID,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_records_tenant_metric ON usage_records (tenant_id, metric, recorded_at DESC);
CREATE INDEX idx_usage_records_subscription ON usage_records (subscription_id, period_start);

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

-- Record migration
INSERT INTO schema_migrations (version, name, executed_at)
VALUES (20, '020_billing_schema', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
