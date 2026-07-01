-- 0009_settings.up.sql
-- Tenant Settings suite, ported from propsense: organisation profile fields
-- on tenants, offices (the firm's own branches), departments + membership,
-- per-tenant email sender settings, and tenant-expandable reference data
-- (picklists). Archive/Billing are read/action endpoints over existing
-- tables, so they need no new schema here.

-- ---------------------------------------------------------------------------
-- Organisation profile — extends the existing tenants table.
-- ---------------------------------------------------------------------------
ALTER TABLE tenants
    ADD COLUMN country         TEXT NOT NULL DEFAULT '',
    ADD COLUMN legal_name      TEXT NOT NULL DEFAULT '',
    ADD COLUMN registration_no TEXT NOT NULL DEFAULT '',
    ADD COLUMN kra_pin         TEXT NOT NULL DEFAULT '',
    ADD COLUMN phone           TEXT NOT NULL DEFAULT '',
    ADD COLUMN email           TEXT NOT NULL DEFAULT '',
    ADD COLUMN website         TEXT NOT NULL DEFAULT '';

-- Per-tenant email/sender preferences (invoice CC/BCC, billing contact).
ALTER TABLE tenants
    ADD COLUMN mail_sender_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN mail_reply_to    TEXT NOT NULL DEFAULT '',
    ADD COLUMN invoice_cc       TEXT NOT NULL DEFAULT '',
    ADD COLUMN invoice_bcc      TEXT NOT NULL DEFAULT '',
    ADD COLUMN billing_email    TEXT NOT NULL DEFAULT '';

-- ---------------------------------------------------------------------------
-- Offices — the firm's own branches (distinct from a Partner's branches).
-- ---------------------------------------------------------------------------
CREATE TABLE offices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    code            TEXT NOT NULL DEFAULT '',
    is_main         BOOLEAN NOT NULL DEFAULT false,
    address         TEXT NOT NULL DEFAULT '',
    town            TEXT NOT NULL DEFAULT '',
    phone           TEXT NOT NULL DEFAULT '',
    email           TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_name TEXT NOT NULL DEFAULT '',
    deleted_at      TIMESTAMPTZ,
    deleted_by_name TEXT NOT NULL DEFAULT '',
    delete_reason   TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_offices_tenant_id ON offices (tenant_id);

-- ---------------------------------------------------------------------------
-- Departments + membership.
-- ---------------------------------------------------------------------------
CREATE TABLE departments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    head_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_name TEXT NOT NULL DEFAULT '',
    deleted_at      TIMESTAMPTZ,
    deleted_by_name TEXT NOT NULL DEFAULT '',
    delete_reason   TEXT NOT NULL DEFAULT '',
    UNIQUE (tenant_id, name)
);
CREATE INDEX idx_departments_tenant_id ON departments (tenant_id);

CREATE TABLE department_members (
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (department_id, user_id)
);
CREATE INDEX idx_department_members_tenant_id ON department_members (tenant_id);
CREATE INDEX idx_department_members_user_id ON department_members (user_id);

-- ---------------------------------------------------------------------------
-- Reference data — tenant-expandable picklists (one generic table serves
-- many categories app-wide, e.g. "industry", "lead_source").
-- ---------------------------------------------------------------------------
CREATE TABLE reference_data (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category        TEXT NOT NULL,
    value           TEXT NOT NULL,
    label           TEXT NOT NULL DEFAULT '',
    sort_order      INT NOT NULL DEFAULT 0,
    created_by_name TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_reference_data_unique ON reference_data (tenant_id, category, value) WHERE deleted_at IS NULL;
CREATE INDEX idx_reference_data_cat ON reference_data (tenant_id, category) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Permission catalog additions.
-- ---------------------------------------------------------------------------
INSERT INTO permissions (key, description) VALUES
    ('departments:read',  'View departments'),
    ('departments:write', 'Create and edit departments'),
    ('archive:read',      'View archived (soft-deleted) records'),
    ('archive:write',     'Restore or permanently purge archived records');
