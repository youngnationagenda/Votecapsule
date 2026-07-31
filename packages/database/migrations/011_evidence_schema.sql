-- ============================================================
-- VoteCapsule Evidence Capsule Service — Database Schema
-- Migration: 001_evidence_schema.sql
-- Spec ref:  VC-SAES-003 Chapter 4, VC-SAES-012 Evidence Domain
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- EVIDENCE CAPSULES
-- The primary business entity. One capsule = one evidence
-- package for one polling station stream + one position.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidence_capsules (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID         NOT NULL,                    -- which party/observer org submitted

    -- Election context (FKs will resolve once Election Service is built)
    election_year           SMALLINT     NOT NULL,
    election_id             UUID,                                     -- FK to elections table (Phase 1 later)
    position_code           VARCHAR(50)  NOT NULL,                    -- PRESIDENT | GOVERNOR | SENATOR | MP | WOMEN_REP | MCA
    position_level          VARCHAR(30)  NOT NULL,                    -- NATIONAL | COUNTY | CONSTITUENCY | WARD

    -- NEC Geography (verified against Geography Service on submission)
    iebc_station_code       CHAR(15)     NOT NULL,                    -- 15-digit IEBC code
    polling_station_name    VARCHAR(250) NOT NULL,                    -- denormalized for audit trail
    ward_code               CHAR(4)      NOT NULL,
    ward_name               VARCHAR(150) NOT NULL,
    constituency_code       CHAR(3)      NOT NULL,
    constituency_name       VARCHAR(150) NOT NULL,
    county_code             CHAR(3)      NOT NULL,
    county_name             VARCHAR(150) NOT NULL,
    stream_number           SMALLINT     NOT NULL,
    registered_voters       INTEGER      NOT NULL,                    -- snapshot at submission time

    -- Agent (the field user who captured)
    agent_user_id           UUID         NOT NULL,                    -- FK to users table
    agent_device_id         UUID,                                     -- FK to user_devices table
    assigned_party_org      VARCHAR(255),                             -- party/organization the agent represents

    -- Capture timing
    captured_at             TIMESTAMPTZ  NOT NULL,                    -- when agent pressed shutter
    submitted_at            TIMESTAMPTZ,                              -- when upload reached server
    synced_at               TIMESTAMPTZ,                              -- when fully verified on server

    -- GPS at capture (nullable until Phase 2+)
    capture_latitude        NUMERIC(10,7),
    capture_longitude       NUMERIC(10,7),
    capture_altitude        NUMERIC(8,2),
    capture_accuracy_meters NUMERIC(6,2),

    -- Status lifecycle
    -- DRAFT → CAPTURED → QUEUED → UPLOADED → AI_PROCESSING →
    -- AI_VERIFIED → PENDING_VALIDATION → APPROVED | REJECTED → ANCHORED → PUBLISHED → ARCHIVED
    status                  VARCHAR(30)  NOT NULL DEFAULT 'DRAFT',

    -- Trust anchoring (Trust Service fills these after approval)
    sha256_hash             CHAR(64),                                 -- computed at capture, verified on arrival
    qldb_document_id        VARCHAR(255),                             -- QLDB ledger document ID
    qldb_anchored_at        TIMESTAMPTZ,
    s3_object_key           VARCHAR(500),                             -- primary image S3 key
    s3_locked               BOOLEAN      NOT NULL DEFAULT FALSE,      -- TRUE once Object Lock applied

    -- AI processing results (summary — detail in evidence_ai_records)
    ai_confidence_score     NUMERIC(5,4),                             -- 0.0000–1.0000
    ai_processed_at         TIMESTAMPTZ,
    ai_flagged              BOOLEAN      NOT NULL DEFAULT FALSE,       -- TRUE if AI raised concerns

    -- Human validation (detail in evidence_validations)
    validated_by            UUID,                                     -- FK to users (validator)
    validated_at            TIMESTAMPTZ,
    validation_decision     VARCHAR(20),                              -- APPROVED | REJECTED | ESCALATED

    -- Publication
    published_at            TIMESTAMPTZ,
    publication_version     SMALLINT     NOT NULL DEFAULT 0,

    -- Sync state for offline-first mobile
    sync_status             VARCHAR(30)  NOT NULL DEFAULT 'PENDING',
    -- PENDING | QUEUED | UPLOADING | UPLOADED | FAILED | RECOVERY_REQUIRED | COMPLETE
    sync_attempts           SMALLINT     NOT NULL DEFAULT 0,
    sync_last_error         TEXT,
    sync_completed_at       TIMESTAMPTZ,

    -- Recovery (if original agent could not submit)
    is_recovery             BOOLEAN      NOT NULL DEFAULT FALSE,
    recovery_agent_id       UUID,
    recovery_reason         TEXT,
    original_capsule_id     UUID         REFERENCES evidence_capsules(id),

    -- Audit
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    is_deleted              BOOLEAN      NOT NULL DEFAULT FALSE,

    CONSTRAINT chk_status CHECK (status IN (
        'DRAFT','CAPTURED','QUEUED','UPLOADED','AI_PROCESSING',
        'AI_VERIFIED','PENDING_VALIDATION','APPROVED','REJECTED',
        'ANCHORED','PUBLISHED','ARCHIVED'
    )),
    CONSTRAINT chk_sync_status CHECK (sync_status IN (
        'PENDING','QUEUED','UPLOADING','UPLOADED',
        'FAILED','RECOVERY_REQUIRED','COMPLETE'
    )),
    CONSTRAINT chk_position CHECK (position_code IN (
        'PRESIDENT','GOVERNOR','SENATOR','WOMEN_REP','MP','MCA'
    ))
);

CREATE INDEX idx_ec_station      ON evidence_capsules(iebc_station_code);
CREATE INDEX idx_ec_status       ON evidence_capsules(status);
CREATE INDEX idx_ec_tenant       ON evidence_capsules(tenant_id);
CREATE INDEX idx_ec_agent        ON evidence_capsules(agent_user_id);
CREATE INDEX idx_ec_county       ON evidence_capsules(county_code);
CREATE INDEX idx_ec_constituency ON evidence_capsules(constituency_code);
CREATE INDEX idx_ec_ward         ON evidence_capsules(ward_code);
CREATE INDEX idx_ec_position     ON evidence_capsules(position_code);
CREATE INDEX idx_ec_election     ON evidence_capsules(election_year);
CREATE INDEX idx_ec_hash         ON evidence_capsules(sha256_hash);
CREATE INDEX idx_ec_qldb         ON evidence_capsules(qldb_document_id);
CREATE INDEX idx_ec_sync         ON evidence_capsules(sync_status) WHERE sync_status != 'COMPLETE';

-- ──────────────────────────────────────────────────────────
-- EVIDENCE IMAGES
-- One capsule can have multiple images (front/back of form)
-- Images are immutable after upload.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidence_images (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    capsule_id          UUID         NOT NULL REFERENCES evidence_capsules(id),

    image_index         SMALLINT     NOT NULL DEFAULT 0,             -- 0=front, 1=back, 2=supplementary
    image_type          VARCHAR(30)  NOT NULL DEFAULT 'FORM_FRONT',
    -- FORM_FRONT | FORM_BACK | SUPPLEMENTARY | STAMP_CLOSEUP | SIGNATURE_CLOSEUP

    -- File info
    original_filename   VARCHAR(255),
    mime_type           VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
    file_size_bytes     INTEGER      NOT NULL,
    width_px            INTEGER,
    height_px           INTEGER,

    -- Integrity
    sha256_hash         CHAR(64)     NOT NULL,                        -- computed at capture (offline-capable)
    sha256_verified     BOOLEAN      NOT NULL DEFAULT FALSE,          -- server recomputed and matched
    sha256_verified_at  TIMESTAMPTZ,

    -- S3 storage
    s3_bucket           VARCHAR(255) NOT NULL,
    s3_key              VARCHAR(500) NOT NULL UNIQUE,
    s3_region           VARCHAR(50)  NOT NULL DEFAULT 'af-south-1',
    s3_object_locked    BOOLEAN      NOT NULL DEFAULT FALSE,          -- WORM lock applied
    s3_object_locked_at TIMESTAMPTZ,
    s3_etag             VARCHAR(255),

    -- Image quality (set by AI service)
    quality_score       NUMERIC(5,4),
    is_blurry           BOOLEAN,
    is_overexposed      BOOLEAN,
    is_too_dark         BOOLEAN,
    quality_notes       TEXT,

    -- Upload state
    upload_status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    -- PENDING | UPLOADING | COMPLETE | FAILED
    uploaded_at         TIMESTAMPTZ,

    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_img_type CHECK (image_type IN (
        'FORM_FRONT','FORM_BACK','SUPPLEMENTARY','STAMP_CLOSEUP','SIGNATURE_CLOSEUP'
    )),
    CONSTRAINT chk_img_index CHECK (image_index >= 0 AND image_index <= 9)
);

CREATE INDEX idx_ei_capsule ON evidence_images(capsule_id);
CREATE INDEX idx_ei_hash    ON evidence_images(sha256_hash);
CREATE INDEX idx_ei_status  ON evidence_images(upload_status) WHERE upload_status != 'COMPLETE';

-- ──────────────────────────────────────────────────────────
-- EVIDENCE HASHES
-- Stores the composite hash record (image bytes + metadata + timestamp)
-- This is the hash anchored to QLDB.
-- Formula: SHA-256(image_bytes + metadata_json + capture_timestamp)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidence_hashes (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    capsule_id          UUID         NOT NULL REFERENCES evidence_capsules(id),
    image_id            UUID         REFERENCES evidence_images(id),

    hash_type           VARCHAR(30)  NOT NULL DEFAULT 'CAPSULE_COMPOSITE',
    -- CAPSULE_COMPOSITE | IMAGE_ONLY | METADATA_ONLY

    -- The hash
    algorithm           VARCHAR(10)  NOT NULL DEFAULT 'SHA-256',
    hash_value          CHAR(64)     NOT NULL,

    -- What was hashed (stored for verification)
    hashed_components   JSONB        NOT NULL,
    -- { "image_s3_key": "...", "metadata_json": "...", "capture_timestamp": "..." }

    -- Computed where
    computed_on_device  BOOLEAN      NOT NULL DEFAULT TRUE,
    device_id           UUID,
    server_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    server_verified_at  TIMESTAMPTZ,
    verification_match  BOOLEAN,                                      -- TRUE = hashes match

    -- QLDB anchor
    qldb_document_id    VARCHAR(255),
    qldb_anchored_at    TIMESTAMPTZ,
    qldb_sequence_no    VARCHAR(100),

    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eh_capsule ON evidence_hashes(capsule_id);
CREATE INDEX idx_eh_value   ON evidence_hashes(hash_value);
CREATE INDEX idx_eh_qldb    ON evidence_hashes(qldb_document_id);

-- ──────────────────────────────────────────────────────────
-- CHAIN OF CUSTODY
-- Immutable event log. Every state transition is recorded here.
-- No record in this table may ever be updated or deleted.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidence_chain_of_custody (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    capsule_id          UUID         NOT NULL REFERENCES evidence_capsules(id),

    event_type          VARCHAR(50)  NOT NULL,
    -- CREATED | CAPTURED | SYNCED | UPLOADED | HASH_VERIFIED |
    -- AI_SUBMITTED | AI_COMPLETED | VALIDATION_ASSIGNED |
    -- VALIDATION_APPROVED | VALIDATION_REJECTED | VALIDATION_ESCALATED |
    -- QLDB_ANCHORED | S3_LOCKED | PUBLISHED | ARCHIVED |
    -- RECOVERY_INITIATED | RECOVERY_COMPLETED

    previous_status     VARCHAR(30),
    new_status          VARCHAR(30),

    actor_user_id       UUID,                                         -- NULL for system events
    actor_service       VARCHAR(100),                                 -- e.g. "evidence-service", "ai-service"
    actor_device_id     UUID,

    -- Context data for this event
    event_data          JSONB,
    -- e.g. { "s3_key": "...", "qldb_id": "...", "ai_score": 0.95 }

    event_timestamp     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    ip_address          INET,

    CONSTRAINT chk_coc_event CHECK (event_type IN (
        'CREATED','CAPTURED','SYNCED','UPLOADED','HASH_VERIFIED',
        'AI_SUBMITTED','AI_COMPLETED','VALIDATION_ASSIGNED',
        'VALIDATION_APPROVED','VALIDATION_REJECTED','VALIDATION_ESCALATED',
        'QLDB_ANCHORED','S3_LOCKED','PUBLISHED','ARCHIVED',
        'RECOVERY_INITIATED','RECOVERY_COMPLETED'
    ))
);

CREATE INDEX idx_coc_capsule   ON evidence_chain_of_custody(capsule_id);
CREATE INDEX idx_coc_event     ON evidence_chain_of_custody(event_type);
CREATE INDEX idx_coc_timestamp ON evidence_chain_of_custody(event_timestamp);
CREATE INDEX idx_coc_actor     ON evidence_chain_of_custody(actor_user_id);

-- ──────────────────────────────────────────────────────────
-- OFFLINE SYNC QUEUE
-- Tracks mobile device submissions waiting to be processed.
-- Entries are created on device and synced to server.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidence_sync_queue (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    capsule_id          UUID         REFERENCES evidence_capsules(id),

    device_id           UUID         NOT NULL,
    agent_user_id       UUID         NOT NULL,

    -- Queued item details
    queue_status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    -- PENDING | PROCESSING | COMPLETE | FAILED | DEAD_LETTER

    -- Payload (encrypted on device, decrypted server-side)
    payload_size_bytes  INTEGER,
    image_count         SMALLINT     NOT NULL DEFAULT 1,
    retry_count         SMALLINT     NOT NULL DEFAULT 0,
    max_retries         SMALLINT     NOT NULL DEFAULT 5,

    -- Network tracking
    first_attempt_at    TIMESTAMPTZ,
    last_attempt_at     TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    last_error          TEXT,

    -- SQS message tracking
    sqs_message_id      VARCHAR(255),
    sqs_receipt_handle  TEXT,

    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_queue_status CHECK (queue_status IN (
        'PENDING','PROCESSING','COMPLETE','FAILED','DEAD_LETTER'
    ))
);

CREATE INDEX idx_sq_device  ON evidence_sync_queue(device_id);
CREATE INDEX idx_sq_agent   ON evidence_sync_queue(agent_user_id);
CREATE INDEX idx_sq_status  ON evidence_sync_queue(queue_status) WHERE queue_status NOT IN ('COMPLETE');
CREATE INDEX idx_sq_capsule ON evidence_sync_queue(capsule_id);
