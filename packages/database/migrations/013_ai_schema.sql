-- ============================================================
-- VoteCapsule — AI Verification Service Database Schema
-- migration: 001_ai_schema.sql
--
-- Stores every AI processing job and its results.
-- AI assists, humans decide. No automated final decisions.
-- ============================================================

-- One record per AI processing job (per Evidence Capsule)
CREATE TABLE IF NOT EXISTS ai_verification_jobs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Evidence reference (cross-service — no FK constraint)
  capsule_id            UUID        NOT NULL UNIQUE,
  iebc_station_code     CHAR(15)    NOT NULL,
  position_code         VARCHAR(50) NOT NULL,
  election_year         SMALLINT    NOT NULL,
  county_code           CHAR(3)     NOT NULL,

  -- Job lifecycle
  -- QUEUED → PROCESSING → COMPLETED → FAILED | ESCALATED
  status                VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
  queued_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  duration_ms           INTEGER,

  -- Textract job tracking (async)
  textract_job_id       VARCHAR(255),
  textract_status       VARCHAR(30),   -- SUBMITTED | IN_PROGRESS | SUCCEEDED | FAILED | PARTIAL_SUCCESS

  -- S3 image reference
  s3_bucket             VARCHAR(255),
  s3_key                VARCHAR(500),

  -- ── Confidence scores (0.0000–1.0000) ────────────────────
  -- Each component contributes to the overall score
  ocr_confidence            NUMERIC(5,4),  -- Textract OCR confidence (avg across all blocks)
  form_recognition_score    NUMERIC(5,4),  -- Did AI recognise this as an official IEBC form?
  station_code_match_score  NUMERIC(5,4),  -- Extracted station code matches IEBC code in submission?
  position_match_score      NUMERIC(5,4),  -- Extracted position matches submitted position code?
  vote_arithmetic_score     NUMERIC(5,4),  -- Totals add up correctly?
  voter_limit_score         NUMERIC(5,4),  -- Vote totals within registered voter limits?
  overall_confidence        NUMERIC(5,4),  -- Weighted composite of all components

  -- ── Routing decision (based on thresholds, not AI alone) ─
  -- APPROVE_FOR_REVIEW = confidence ≥ 0.80, route to validator queue
  -- MANUAL_REVIEW      = confidence 0.60–0.79, flag for closer look
  -- ESCALATE           = confidence < 0.60 or fraud signal, escalate
  routing_decision      VARCHAR(20),   -- APPROVE_FOR_REVIEW | MANUAL_REVIEW | ESCALATE
  routing_reason        TEXT,

  -- ── Fraud / anomaly flags ─────────────────────────────────
  is_flagged            BOOLEAN     NOT NULL DEFAULT FALSE,
  flag_reasons          JSONB,         -- Array of flag strings, e.g. ["VOTE_TOTAL_EXCEEDS_REGISTERED"]

  -- ── OCR extracted data ────────────────────────────────────
  extracted_station_code     CHAR(15),
  extracted_station_name     VARCHAR(250),
  extracted_position         VARCHAR(100),
  extracted_stream_number    SMALLINT,
  extracted_registered_voters INTEGER,
  extracted_votes_cast       INTEGER,
  extracted_valid_votes      INTEGER,
  extracted_rejected_votes   INTEGER,
  raw_ocr_text               TEXT,       -- Full Textract output as text
  ocr_blocks                 JSONB,      -- Structured Textract blocks (key-value pairs, tables)

  -- ── NEC cross-validation ──────────────────────────────────
  -- Compares extracted data against NEC geography snapshot
  station_code_verified      BOOLEAN,    -- Extracted code = submitted code?
  station_name_verified      BOOLEAN,    -- Extracted name ≈ NEC name?
  position_verified          BOOLEAN,    -- Extracted position = submitted position?
  voter_limit_respected      BOOLEAN,    -- votes_cast ≤ registered_voters?
  arithmetic_valid           BOOLEAN,    -- valid_votes + rejected = votes_cast?

  -- ── Retry ────────────────────────────────────────────────
  attempt_count         SMALLINT    NOT NULL DEFAULT 1,
  max_attempts          SMALLINT    NOT NULL DEFAULT 3,
  last_error            TEXT,
  next_retry_at         TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_ai_status CHECK (status IN (
    'QUEUED','PROCESSING','COMPLETED','FAILED','ESCALATED'
  )),
  CONSTRAINT chk_routing CHECK (routing_decision IN (
    'APPROVE_FOR_REVIEW','MANUAL_REVIEW','ESCALATE'
  ) OR routing_decision IS NULL)
);

CREATE INDEX IF NOT EXISTS ix_ai_jobs_capsule
  ON ai_verification_jobs (capsule_id);
CREATE INDEX IF NOT EXISTS ix_ai_jobs_status
  ON ai_verification_jobs (status);
CREATE INDEX IF NOT EXISTS ix_ai_jobs_station
  ON ai_verification_jobs (iebc_station_code);
CREATE INDEX IF NOT EXISTS ix_ai_jobs_flagged
  ON ai_verification_jobs (is_flagged) WHERE is_flagged = TRUE;

-- Anomaly detection events
-- Any suspicious signal is recorded here, even if the job completes
CREATE TABLE IF NOT EXISTS ai_anomaly_events (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID        NOT NULL REFERENCES ai_verification_jobs(id),
  capsule_id        UUID        NOT NULL,

  anomaly_type      VARCHAR(50) NOT NULL,
  -- DUPLICATE_CAPSULE | IMAGE_MANIPULATION | INVALID_STATION_CODE
  -- VOTE_TOTAL_EXCEEDS_REGISTERED | ZERO_VOTES_ALL_CANDIDATES
  -- MISSING_SIGNATURE | MISSING_STAMP | ARITHMETIC_ERROR
  -- UNUSUAL_VOTE_PATTERN | FORM_NOT_RECOGNISED | LOW_IMAGE_QUALITY

  severity          VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  -- LOW | MEDIUM | HIGH | CRITICAL

  description       TEXT        NOT NULL,
  evidence_data     JSONB,      -- Supporting data for the anomaly
  auto_escalated    BOOLEAN     NOT NULL DEFAULT FALSE,
  reviewed_by       UUID,       -- If a human has reviewed and closed this anomaly
  reviewed_at       TIMESTAMPTZ,
  review_outcome    VARCHAR(20), -- CONFIRMED | FALSE_POSITIVE | INCONCLUSIVE

  detected_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ai_anomalies_job
  ON ai_anomaly_events (job_id);
CREATE INDEX IF NOT EXISTS ix_ai_anomalies_capsule
  ON ai_anomaly_events (capsule_id);
CREATE INDEX IF NOT EXISTS ix_ai_anomalies_type
  ON ai_anomaly_events (anomaly_type);
CREATE INDEX IF NOT EXISTS ix_ai_anomalies_severity
  ON ai_anomaly_events (severity) WHERE severity IN ('HIGH','CRITICAL');

-- ============================================================
-- End of AI schema
-- ============================================================
