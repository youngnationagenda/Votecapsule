-- ============================================================
-- VoteCapsule — Workflow Engine Database Schema
-- migration: 001_workflow_schema.sql
--
-- Tracks workflow execution instances and step histories.
-- Step Functions is the execution engine — this is the
-- operational index: query-able state for the Admin Portal.
-- ============================================================

-- One row per workflow execution (Step Functions execution)
CREATE TABLE IF NOT EXISTS workflow_executions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Step Functions reference
  execution_arn         VARCHAR(2048) UNIQUE,               -- full ARN from AWS
  state_machine_arn     VARCHAR(2048),                      -- which state machine
  workflow_type         VARCHAR(50)  NOT NULL,
  -- EVIDENCE_CAPSULE | TENANT_PROVISIONING | USER_ONBOARDING
  -- RESULTS_PUBLICATION | RECOVERY | ESCALATION | ASSIGNMENT

  -- Business context (cross-service refs — no FK constraints)
  tenant_id             UUID,
  capsule_id            UUID,                               -- set for EVIDENCE_CAPSULE workflows
  election_id           UUID,
  initiator_user_id     UUID,
  initiator_service     VARCHAR(100),

  -- Lifecycle
  -- RUNNING → SUCCEEDED | FAILED | TIMED_OUT | ABORTED
  status                VARCHAR(30)  NOT NULL DEFAULT 'RUNNING',
  current_step          VARCHAR(100),                       -- name of current Step Functions state

  -- SLA tracking
  started_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deadline_at           TIMESTAMPTZ,                        -- escalate if not complete by this
  completed_at          TIMESTAMPTZ,
  duration_ms           INTEGER,

  -- Retry tracking
  attempt_count         SMALLINT     NOT NULL DEFAULT 1,
  last_error            TEXT,

  -- Full input/output stored for audit
  input_payload         JSONB,
  output_payload        JSONB,

  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_wf_status CHECK (status IN (
    'RUNNING','SUCCEEDED','FAILED','TIMED_OUT','ABORTED'
  )),
  CONSTRAINT chk_wf_type CHECK (workflow_type IN (
    'EVIDENCE_CAPSULE','TENANT_PROVISIONING','USER_ONBOARDING',
    'RESULTS_PUBLICATION','RECOVERY','ESCALATION','ASSIGNMENT'
  ))
);

CREATE INDEX IF NOT EXISTS ix_wf_exec_capsule
  ON workflow_executions (capsule_id) WHERE capsule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_wf_exec_tenant
  ON workflow_executions (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_wf_exec_status
  ON workflow_executions (status);
CREATE INDEX IF NOT EXISTS ix_wf_exec_type
  ON workflow_executions (workflow_type);
CREATE INDEX IF NOT EXISTS ix_wf_exec_deadline
  ON workflow_executions (deadline_at) WHERE deadline_at IS NOT NULL AND status = 'RUNNING';

-- Per-step audit log (mirrors Step Functions history but queryable)
CREATE TABLE IF NOT EXISTS workflow_step_events (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id      UUID        NOT NULL REFERENCES workflow_executions(id),

  step_name         VARCHAR(100) NOT NULL,
  event_type        VARCHAR(50)  NOT NULL,
  -- ENTERED | EXITED | TASK_SUBMITTED | TASK_SUCCEEDED
  -- TASK_FAILED | RETRY | HEARTBEAT | TIMEOUT | CATCH

  previous_step     VARCHAR(100),
  next_step         VARCHAR(100),
  task_resource     VARCHAR(500),                           -- Lambda ARN or service integration
  input_data        JSONB,
  output_data       JSONB,
  error_code        VARCHAR(100),
  error_cause       TEXT,

  occurred_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_wf_steps_execution
  ON workflow_step_events (execution_id);
CREATE INDEX IF NOT EXISTS ix_wf_steps_type
  ON workflow_step_events (event_type);

-- Escalation events — SLA breaches and supervisor notifications
CREATE TABLE IF NOT EXISTS workflow_escalations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id      UUID        NOT NULL REFERENCES workflow_executions(id),

  escalation_type   VARCHAR(50)  NOT NULL,
  -- DEADLINE_BREACH | VALIDATION_OVERDUE | AI_FAILURE
  -- TRUST_FAILURE | MANUAL_INTERVENTION_REQUIRED

  severity          VARCHAR(20)  NOT NULL DEFAULT 'HIGH',
  -- LOW | MEDIUM | HIGH | CRITICAL

  message           TEXT         NOT NULL,
  escalated_to      UUID,                                   -- supervisor user ID
  notified_at       TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID,
  resolution_notes  TEXT,

  detected_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_wf_esc_execution
  ON workflow_escalations (execution_id);
CREATE INDEX IF NOT EXISTS ix_wf_esc_unresolved
  ON workflow_escalations (detected_at) WHERE resolved_at IS NULL;

-- ============================================================
-- End of workflow schema
-- ============================================================
