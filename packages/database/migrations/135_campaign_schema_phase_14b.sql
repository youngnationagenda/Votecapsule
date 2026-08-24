-- ============================================================
-- VoteCapsule™ — Campaign Manager Schema Phase 14B
-- Migration: 135_campaign_schema_phase_14b.sql
--
-- Tables: material categories/types/suppliers/orders/inventory/
--         distributions, media, mockup templates, design requests,
--         outdoor placements/conditions, vehicles/trips,
--         equipment/logs, budgets/categories/expenses/contributions
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 138: CAMPAIGN MATERIAL CATEGORIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_material_categories (
    id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code        VARCHAR(50) NOT NULL UNIQUE,
    name        VARCHAR(150) NOT NULL,
    icon        VARCHAR(50),
    sort_order  SMALLINT    NOT NULL DEFAULT 0,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 139: CAMPAIGN MATERIAL TYPES
-- Catalogue of all orderable material types
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_material_types (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id         UUID         NOT NULL REFERENCES campaign_material_categories(id),
    code                VARCHAR(50)  NOT NULL UNIQUE,
    name                VARCHAR(200) NOT NULL,
    description         TEXT,
    thumbnail_key       VARCHAR(500),                          -- S3 unbranded mockup
    preview_key         VARCHAR(500),
    available_sizes     JSONB        NOT NULL DEFAULT '[]',    -- [{"code":"A4","label":"A4 (210x297mm)"}]
    specifications      JSONB        NOT NULL DEFAULT '{}',
    branding_zones      JSONB        NOT NULL DEFAULT '[]',    -- zones for mockup engine
    typical_cost_min    DECIMAL(12,2),
    typical_cost_max    DECIMAL(12,2),
    unit                VARCHAR(30)  NOT NULL DEFAULT 'piece', -- piece | roll | set | pack
    min_order_quantity  INT          NOT NULL DEFAULT 1,
    lead_time_days      SMALLINT     NOT NULL DEFAULT 7,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cmt_category ON campaign_material_types(category_id);

-- ─────────────────────────────────────────────────────────────
-- 140: CAMPAIGN SUPPLIERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_suppliers (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id           UUID         NOT NULL,
    company_name        VARCHAR(300) NOT NULL,
    contact_name        VARCHAR(200),
    contact_phone       VARCHAR(20),
    contact_email       VARCHAR(200),
    county_code         CHAR(3),
    address             TEXT,
    capabilities        TEXT[]       NOT NULL DEFAULT '{}',
    lead_time_days      SMALLINT     NOT NULL DEFAULT 7,
    quality_rating      DECIMAL(3,2) NOT NULL DEFAULT 0,       -- 0.00–5.00
    delivery_reliability DECIMAL(5,2) NOT NULL DEFAULT 0,      -- 0–100 percentage
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    notes               TEXT,
    created_by          UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cs_tenant ON campaign_suppliers(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- 141: CAMPAIGN MATERIAL ORDERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_material_orders (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL,
    order_number        VARCHAR(30)  NOT NULL UNIQUE,           -- CM-2027-0001
    material_type_id    UUID         NOT NULL REFERENCES campaign_material_types(id),
    quantity            INT          NOT NULL,
    size_code           VARCHAR(20),
    -- Design fields
    design_request_id   UUID,
    design_notes        TEXT,
    -- Supplier
    supplier_id         UUID         REFERENCES campaign_suppliers(id),
    -- Production status lifecycle
    production_status   VARCHAR(30)  NOT NULL DEFAULT 'draft',
                        -- draft | approved | in_production | quality_check | dispatched | delivered | cancelled
    -- Cost fields
    unit_cost           DECIMAL(12,2),
    total_cost          DECIMAL(15,2),
    amount_paid         DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_status      VARCHAR(20)  NOT NULL DEFAULT 'unpaid',
                        -- unpaid | partial | paid
    -- Target geography
    target_county_code  CHAR(3),
    target_constituency_code CHAR(3),
    target_ward_code    CHAR(4),
    -- Approval workflow
    requested_by        UUID         NOT NULL,
    approved_by         UUID,
    approved_at         TIMESTAMPTZ,
    approval_notes      TEXT,
    -- Timeline
    ordered_date        DATE,
    expected_delivery   DATE,
    actual_delivery     DATE,
    notes               TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cmo_campaign   ON campaign_material_orders(campaign_id);
CREATE INDEX idx_cmo_tenant     ON campaign_material_orders(tenant_id);
CREATE INDEX idx_cmo_status     ON campaign_material_orders(production_status);
CREATE INDEX idx_cmo_type       ON campaign_material_orders(material_type_id);

-- ─────────────────────────────────────────────────────────────
-- 142: CAMPAIGN MEDIA
-- All media assets — photos, videos, documents, mockups
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_media (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL,
    storage_key         VARCHAR(500) NOT NULL,                  -- S3 key
    thumbnail_key       VARCHAR(500),
    file_name           VARCHAR(300) NOT NULL,
    file_size_bytes     BIGINT       NOT NULL DEFAULT 0,
    mime_type           VARCHAR(100) NOT NULL,
    width_px            INT,
    height_px           INT,
    dpi                 SMALLINT,
    duration_seconds    INT,                                    -- for video
    -- Associations
    order_id            UUID         REFERENCES campaign_material_orders(id),
    event_id            UUID         REFERENCES campaign_events(id),
    -- Metadata
    approval_status     VARCHAR(20)  NOT NULL DEFAULT 'pending',
                        -- pending | approved | rejected
    version             SMALLINT     NOT NULL DEFAULT 1,
    parent_media_id     UUID,                                   -- for versioning
    tags                TEXT[]       NOT NULL DEFAULT '{}',
    description         TEXT,
    uploaded_by         UUID         NOT NULL,
    processing_status   VARCHAR(20)  NOT NULL DEFAULT 'pending',
                        -- pending | processing | ready | failed
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cm_campaign    ON campaign_media(campaign_id);
CREATE INDEX idx_cm_tenant      ON campaign_media(tenant_id);
CREATE INDEX idx_cm_order       ON campaign_media(order_id);
CREATE INDEX idx_cm_event       ON campaign_media(event_id);
CREATE INDEX idx_cm_tags        ON campaign_media USING GIN(tags);

-- ─────────────────────────────────────────────────────────────
-- 143: CAMPAIGN MOCKUP TEMPLATES
-- Template zones for AI mockup compositing engine
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_mockup_templates (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    material_type_id    UUID         NOT NULL REFERENCES campaign_material_types(id),
    template_name       VARCHAR(200) NOT NULL,
    base_image_key      VARCHAR(500) NOT NULL,                  -- S3 base template
    zones               JSONB        NOT NULL DEFAULT '[]',
                        -- [{id,type,x,y,width,height,label,required}]
    colour_zones        JSONB        NOT NULL DEFAULT '{}',
                        -- {primary_bg: "#hex", secondary_bg: "#hex"}
    surface_type        VARCHAR(30)  NOT NULL DEFAULT 'flat',
                        -- flat | curved | fabric | mug
    canvas_width        INT          NOT NULL DEFAULT 2480,     -- px at 300dpi
    canvas_height       INT          NOT NULL DEFAULT 3508,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cmt_type ON campaign_mockup_templates(material_type_id);

-- ─────────────────────────────────────────────────────────────
-- 144: CAMPAIGN DESIGN REQUESTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_design_requests (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL,
    material_type_id    UUID         NOT NULL REFERENCES campaign_material_types(id),
    template_id         UUID         REFERENCES campaign_mockup_templates(id),
    -- Candidate inputs
    candidate_photo_key VARCHAR(500),
    candidate_name      VARCHAR(300),
    candidate_slogan    VARCHAR(500),
    party_id            UUID,
    primary_colour      CHAR(7),
    secondary_colour    CHAR(7),
    custom_text         JSONB        NOT NULL DEFAULT '{}',
    logo_key            VARCHAR(500),
    -- Generated outputs
    preview_media_id    UUID         REFERENCES campaign_media(id),
    highres_media_id    UUID         REFERENCES campaign_media(id),
    print_ready_media_id UUID        REFERENCES campaign_media(id),
    -- Approval workflow
    approval_status     VARCHAR(20)  NOT NULL DEFAULT 'draft',
                        -- draft | generating | preview_ready | approved | rejected | revision_requested
    approved_by         UUID,
    approved_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    -- Variation chain
    parent_design_id    UUID         REFERENCES campaign_design_requests(id),
    version             SMALLINT     NOT NULL DEFAULT 1,
    requested_by        UUID         NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cdr_campaign   ON campaign_design_requests(campaign_id);
CREATE INDEX idx_cdr_tenant     ON campaign_design_requests(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- 145: CAMPAIGN MATERIAL INVENTORY
-- Stock levels per geography
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_material_inventory (
    id                      UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id             UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id               UUID         NOT NULL,
    material_type_id        UUID         NOT NULL REFERENCES campaign_material_types(id),
    county_code             CHAR(3),
    constituency_code       CHAR(3),
    ward_code               CHAR(4),
    quantity_received       INT          NOT NULL DEFAULT 0,
    quantity_distributed    INT          NOT NULL DEFAULT 0,
    quantity_damaged        INT          NOT NULL DEFAULT 0,
    quantity_remaining      INT          GENERATED ALWAYS AS
                            (quantity_received - quantity_distributed - quantity_damaged) STORED,
    last_updated_by         UUID,
    notes                   TEXT,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cmi_campaign   ON campaign_material_inventory(campaign_id);
CREATE INDEX idx_cmi_type       ON campaign_material_inventory(material_type_id);
CREATE INDEX idx_cmi_ward       ON campaign_material_inventory(ward_code);

-- ─────────────────────────────────────────────────────────────
-- 146: CAMPAIGN MATERIAL DISTRIBUTIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_material_distributions (
    id                      UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id             UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id               UUID         NOT NULL,
    material_type_id        UUID         NOT NULL REFERENCES campaign_material_types(id),
    inventory_id            UUID         REFERENCES campaign_material_inventory(id),
    quantity                INT          NOT NULL,
    from_county_code        CHAR(3),
    from_constituency_code  CHAR(3),
    from_ward_code          CHAR(4),
    to_county_code          CHAR(3),
    to_constituency_code    CHAR(3),
    to_ward_code            CHAR(4),
    recipient_name          VARCHAR(200),
    recipient_id            UUID,
    evidence_media_id       UUID         REFERENCES campaign_media(id),
    lat                     DECIMAL(10,7),
    lng                     DECIMAL(10,7),
    qr_scanned              BOOLEAN      NOT NULL DEFAULT FALSE,
    qr_code                 VARCHAR(200),
    status                  VARCHAR(20)  NOT NULL DEFAULT 'completed',
                            -- pending | in_transit | completed | returned
    distributed_by          UUID         NOT NULL,
    distributed_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    notes                   TEXT,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cmd_campaign   ON campaign_material_distributions(campaign_id);
CREATE INDEX idx_cmd_type       ON campaign_material_distributions(material_type_id);
CREATE INDEX idx_cmd_ward       ON campaign_material_distributions(to_ward_code);

-- ─────────────────────────────────────────────────────────────
-- 147: CAMPAIGN OUTDOOR PLACEMENTS
-- Billboards, posters, banners, etc.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_outdoor_placements (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL,
    placement_type      VARCHAR(50)  NOT NULL,
                        -- BILLBOARD | BANNER | POSTER | SIGNAGE | VEHICLE_WRAP | WALL_MURAL | OTHER
    description         VARCHAR(300),
    lat                 DECIMAL(10,7) NOT NULL,
    lng                 DECIMAL(10,7) NOT NULL,
    county_code         CHAR(3),
    constituency_code   CHAR(3),
    ward_code           CHAR(4),
    location_address    TEXT,
    -- Dimensions
    width_cm            DECIMAL(8,2),
    height_cm           DECIMAL(8,2),
    material            VARCHAR(100),                          -- vinyl | fabric | paper
    -- Installation
    installed_date      DATE,
    removal_date        DATE,
    -- Permit
    permit_required     BOOLEAN      NOT NULL DEFAULT FALSE,
    permit_number       VARCHAR(100),
    permit_expiry       DATE,
    -- Cost
    installation_cost   DECIMAL(12,2) NOT NULL DEFAULT 0,
    monthly_rental_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- Condition tracking
    current_condition   VARCHAR(20)  NOT NULL DEFAULT 'good',
                        -- good | fair | damaged | removed
    status              VARCHAR(20)  NOT NULL DEFAULT 'active',
                        -- active | inactive | pending | removed
    media_id            UUID         REFERENCES campaign_media(id),
    created_by          UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cop_campaign   ON campaign_outdoor_placements(campaign_id);
CREATE INDEX idx_cop_tenant     ON campaign_outdoor_placements(tenant_id);
CREATE INDEX idx_cop_ward       ON campaign_outdoor_placements(ward_code);
CREATE INDEX idx_cop_status     ON campaign_outdoor_placements(status);

-- ─────────────────────────────────────────────────────────────
-- 148: CAMPAIGN OUTDOOR CONDITIONS
-- Condition inspection log
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_outdoor_conditions (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    placement_id        UUID         NOT NULL REFERENCES campaign_outdoor_placements(id) ON DELETE CASCADE,
    campaign_id         UUID         NOT NULL,
    tenant_id           UUID         NOT NULL,
    inspected_by        UUID         NOT NULL,
    condition           VARCHAR(20)  NOT NULL,
                        -- good | fair | damaged | vandalized | removed
    photo_media_id      UUID         REFERENCES campaign_media(id),
    lat                 DECIMAL(10,7),
    lng                 DECIMAL(10,7),
    action_required     TEXT,
    notes               TEXT,
    inspected_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_coc_placement  ON campaign_outdoor_conditions(placement_id);

-- ─────────────────────────────────────────────────────────────
-- 149: CAMPAIGN VEHICLES
-- Fleet management
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_vehicles (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL,
    vehicle_type        VARCHAR(50)  NOT NULL DEFAULT 'CAR',
                        -- CAR | VAN | BUS | TRUCK | MOTORBIKE | TRACTOR
    make                VARCHAR(100),
    model               VARCHAR(100),
    registration        VARCHAR(30)  NOT NULL,
    colour              VARCHAR(50),
    capacity            SMALLINT     NOT NULL DEFAULT 5,
    assigned_driver_id  UUID,
    assigned_driver_name VARCHAR(200),
    assigned_coordinator_id UUID,
    current_lat         DECIMAL(10,7),
    current_lng         DECIMAL(10,7),
    status              VARCHAR(30)  NOT NULL DEFAULT 'available',
                        -- available | in_use | maintenance | off_duty | decommissioned
    fuel_type           VARCHAR(20)  NOT NULL DEFAULT 'petrol',
    branding_status     VARCHAR(20)  NOT NULL DEFAULT 'unbranded',
                        -- unbranded | branded | partial
    ownership_type      VARCHAR(20)  NOT NULL DEFAULT 'rented',
                        -- owned | rented | borrowed
    monthly_rental_cost DECIMAL(12,2),
    notes               TEXT,
    created_by          UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cveh_campaign  ON campaign_vehicles(campaign_id);
CREATE INDEX idx_cveh_tenant    ON campaign_vehicles(tenant_id);
CREATE INDEX idx_cveh_status    ON campaign_vehicles(status);

-- ─────────────────────────────────────────────────────────────
-- 150: CAMPAIGN VEHICLE TRIPS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_vehicle_trips (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id          UUID         NOT NULL REFERENCES campaign_vehicles(id) ON DELETE CASCADE,
    campaign_id         UUID         NOT NULL,
    tenant_id           UUID         NOT NULL,
    event_id            UUID         REFERENCES campaign_events(id),
    purpose             VARCHAR(300),
    origin_lat          DECIMAL(10,7),
    origin_lng          DECIMAL(10,7),
    origin_name         VARCHAR(200),
    destination_lat     DECIMAL(10,7),
    destination_lng     DECIMAL(10,7),
    destination_name    VARCHAR(200),
    departure_time      TIMESTAMPTZ,
    arrival_time        TIMESTAMPTZ,
    distance_km         DECIMAL(8,2),
    fuel_cost           DECIMAL(12,2),
    driver_id           UUID,
    passengers          INT          NOT NULL DEFAULT 0,
    notes               TEXT,
    created_by          UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cvt_vehicle    ON campaign_vehicle_trips(vehicle_id);
CREATE INDEX idx_cvt_campaign   ON campaign_vehicle_trips(campaign_id);
CREATE INDEX idx_cvt_event      ON campaign_vehicle_trips(event_id);

-- ─────────────────────────────────────────────────────────────
-- 151: CAMPAIGN EQUIPMENT
-- PA systems, generators, chairs, tents, etc.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_equipment (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL,
    equipment_type      VARCHAR(100) NOT NULL,
                        -- PA_SYSTEM | GENERATOR | CHAIRS | TENTS | STAGE | MICROPHONE | PROJECTOR | OTHER
    name                VARCHAR(200) NOT NULL,
    quantity            INT          NOT NULL DEFAULT 1,
    serial_number       VARCHAR(100),
    status              VARCHAR(30)  NOT NULL DEFAULT 'available',
                        -- available | reserved | dispatched | in_use | returned | maintenance | lost
    assigned_event_id   UUID         REFERENCES campaign_events(id),
    current_condition   VARCHAR(20)  NOT NULL DEFAULT 'good',
    estimated_value     DECIMAL(12,2),
    ownership_type      VARCHAR(20)  NOT NULL DEFAULT 'owned',
    notes               TEXT,
    created_by          UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ceq_campaign   ON campaign_equipment(campaign_id);
CREATE INDEX idx_ceq_tenant     ON campaign_equipment(tenant_id);
CREATE INDEX idx_ceq_status     ON campaign_equipment(status);

-- ─────────────────────────────────────────────────────────────
-- 152: CAMPAIGN EQUIPMENT LOGS
-- State-change audit trail
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_equipment_logs (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id        UUID         NOT NULL REFERENCES campaign_equipment(id) ON DELETE CASCADE,
    campaign_id         UUID         NOT NULL,
    tenant_id           UUID         NOT NULL,
    previous_status     VARCHAR(30),
    new_status          VARCHAR(30)  NOT NULL,
    changed_by          UUID         NOT NULL,
    event_id            UUID         REFERENCES campaign_events(id),
    evidence_media_id   UUID         REFERENCES campaign_media(id),
    notes               TEXT,
    changed_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cel_equipment  ON campaign_equipment_logs(equipment_id);

-- ─────────────────────────────────────────────────────────────
-- 153: CAMPAIGN BUDGETS
-- Master budget per campaign
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_budgets (
    id                          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id                 UUID         NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id                   UUID         NOT NULL,
    total_allocated             DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_committed             DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_spent                 DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_remaining             DECIMAL(15,2) GENERATED ALWAYS AS
                                (total_allocated - total_spent) STORED,
    -- IEBC spending limit
    iebc_spending_limit         DECIMAL(15,2),
    iebc_limit_percentage_used  DECIMAL(5,2) GENERATED ALWAYS AS
                                (CASE WHEN iebc_spending_limit > 0
                                    THEN ROUND((total_spent / iebc_spending_limit) * 100, 2)
                                    ELSE 0 END) STORED,
    currency                    CHAR(3)      NOT NULL DEFAULT 'KES',
    fiscal_year                 SMALLINT,
    notes                       TEXT,
    created_by                  UUID,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cb_campaign    ON campaign_budgets(campaign_id);
CREATE INDEX idx_cb_tenant      ON campaign_budgets(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- 154: CAMPAIGN BUDGET CATEGORIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_budget_categories (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    budget_id           UUID         NOT NULL REFERENCES campaign_budgets(id) ON DELETE CASCADE,
    campaign_id         UUID         NOT NULL,
    tenant_id           UUID         NOT NULL,
    category_code       VARCHAR(50)  NOT NULL,
                        -- transport | fuel | printing | branding | events | communications | personnel | other
    category_name       VARCHAR(100) NOT NULL,
    allocated           DECIMAL(15,2) NOT NULL DEFAULT 0,
    committed           DECIMAL(15,2) NOT NULL DEFAULT 0,
    spent               DECIMAL(15,2) NOT NULL DEFAULT 0,
    remaining           DECIMAL(15,2) GENERATED ALWAYS AS (allocated - spent) STORED,
    alert_threshold_pct SMALLINT     NOT NULL DEFAULT 80,      -- alert at X% used
    alert_sent_80       BOOLEAN      NOT NULL DEFAULT FALSE,
    alert_sent_95       BOOLEAN      NOT NULL DEFAULT FALSE,
    notes               TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(budget_id, category_code)
);
CREATE INDEX idx_cbc_budget     ON campaign_budget_categories(budget_id);
CREATE INDEX idx_cbc_campaign   ON campaign_budget_categories(campaign_id);

-- ─────────────────────────────────────────────────────────────
-- 155: CAMPAIGN EXPENSES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_expenses (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    budget_id           UUID         REFERENCES campaign_budgets(id),
    category_id         UUID         REFERENCES campaign_budget_categories(id),
    tenant_id           UUID         NOT NULL,
    description         VARCHAR(500) NOT NULL,
    amount              DECIMAL(15,2) NOT NULL,
    expense_date        DATE         NOT NULL DEFAULT CURRENT_DATE,
    -- Source linkage
    source_type         VARCHAR(30),
                        -- EVENT | ORDER | PLACEMENT | TRIP | SMS | MANUAL
    event_id            UUID         REFERENCES campaign_events(id),
    order_id            UUID         REFERENCES campaign_material_orders(id),
    placement_id        UUID         REFERENCES campaign_outdoor_placements(id),
    trip_id             UUID         REFERENCES campaign_vehicle_trips(id),
    -- Payment
    payment_method      VARCHAR(30)  NOT NULL DEFAULT 'cash',
                        -- mpesa | bank | cash | cheque
    mpesa_ref           VARCHAR(100),
    bank_ref            VARCHAR(100),
    receipt_media_id    UUID         REFERENCES campaign_media(id),
    -- IEBC
    iebc_reportable     BOOLEAN      NOT NULL DEFAULT TRUE,
    -- County/ward scope
    county_code         CHAR(3),
    ward_code           CHAR(4),
    recorded_by         UUID         NOT NULL,
    approved_by         UUID,
    notes               TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cexp_campaign  ON campaign_expenses(campaign_id);
CREATE INDEX idx_cexp_tenant    ON campaign_expenses(tenant_id);
CREATE INDEX idx_cexp_category  ON campaign_expenses(category_id);
CREATE INDEX idx_cexp_date      ON campaign_expenses(expense_date);
CREATE INDEX idx_cexp_ward      ON campaign_expenses(ward_code);

-- ─────────────────────────────────────────────────────────────
-- 156: CAMPAIGN CONTRIBUTIONS
-- Income / contributions tracking
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_contributions (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    budget_id           UUID         REFERENCES campaign_budgets(id),
    tenant_id           UUID         NOT NULL,
    contributor_name    VARCHAR(300) NOT NULL,
    contributor_type    VARCHAR(30)  NOT NULL DEFAULT 'individual',
                        -- individual | organization | party | in_kind
    contributor_id_type VARCHAR(20),                           -- national_id | passport | company_reg
    contributor_id_no   VARCHAR(50),
    amount              DECIMAL(15,2) NOT NULL DEFAULT 0,
    in_kind_description TEXT,
    in_kind_value       DECIMAL(15,2),
    contribution_type   VARCHAR(20)  NOT NULL DEFAULT 'cash',
                        -- cash | mpesa | bank | in_kind
    mpesa_ref           VARCHAR(100),
    bank_ref            VARCHAR(100),
    receipt_number      VARCHAR(100),
    receipt_media_id    UUID         REFERENCES campaign_media(id),
    contribution_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
    -- IEBC
    iebc_declaration_status VARCHAR(20) NOT NULL DEFAULT 'pending',
                            -- pending | declared | exempt
    iebc_declared_at    TIMESTAMPTZ,
    recorded_by         UUID         NOT NULL,
    notes               TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cc_campaign    ON campaign_contributions(campaign_id);
CREATE INDEX idx_cc_tenant      ON campaign_contributions(tenant_id);
CREATE INDEX idx_cc_date        ON campaign_contributions(contribution_date);
