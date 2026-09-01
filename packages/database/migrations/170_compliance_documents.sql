-- ============================================================
-- VoteCapsule™ — Migration 170: Compliance Document Storage
-- IEBC Campaign Financing Act, 2013 — Form ECF document uploads
-- Depends on: Migration 169 (compliance tables)
-- ============================================================

BEGIN;

-- ── campaign_compliance_documents ────────────────────────────
-- Stores uploaded IEBC compliance documents per campaign.
-- One row per doc_code per campaign (UNIQUE constraint).
-- Candidate portals have 12 valid codes; party has 15.

CREATE TABLE IF NOT EXISTS campaign_compliance_documents (
    id                UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id       UUID          NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id         UUID          NOT NULL,
    doc_code          VARCHAR(50)   NOT NULL,
    -- Valid candidate codes (12):
    --   ecf1, ecf2, id_copies, bank_statement, bank_opening,
    --   ecf5, ecf6_prelim, ecf6_final, ecf7, auditor_report, receipts, ecf8
    -- Additional party codes (3):
    --   ecf3, ecf4, expenditure_committee
    file_name         VARCHAR(255)  NOT NULL,
    s3_key            VARCHAR(500)  NOT NULL,
    content_type      VARCHAR(100),
    file_size_bytes   BIGINT,
    uploaded_by       UUID,
    status            VARCHAR(20)   NOT NULL DEFAULT 'pending',
    -- 'pending' | 'verified' | 'rejected'
    reviewer_notes    TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- One document per code per campaign
    CONSTRAINT uq_compliance_doc UNIQUE (campaign_id, doc_code)
);

CREATE INDEX IF NOT EXISTS idx_ccd_campaign
    ON campaign_compliance_documents (campaign_id);

CREATE INDEX IF NOT EXISTS idx_ccd_tenant
    ON campaign_compliance_documents (tenant_id);

CREATE INDEX IF NOT EXISTS idx_ccd_status
    ON campaign_compliance_documents (status);

-- ── Record migration ──────────────────────────────────────────
INSERT INTO schema_migrations (filename, executed_at)
VALUES ('170_compliance_documents.sql', NOW())
ON CONFLICT DO NOTHING;

COMMIT;
