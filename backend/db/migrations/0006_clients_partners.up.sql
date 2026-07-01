-- Clients & Partners module, ported from propsense (waterboy backend).
-- propsense scopes these tables via Postgres RLS + current_tenant_id();
-- MojaCRM has no RLS, so every table carries an explicit tenant_id column
-- and every query filters on it in application code (see db/queries).
--
-- Naming note: propsense's "contacts" table holds contact persons that
-- belong to a PARTNER. MojaCRM already has a `contacts` table for its
-- Directory module (contacts belonging to a `customer`). To avoid a
-- collision/confusion between the two different concepts, this partner-side
-- table is named `partner_contacts` here.
--
-- Note: propsense's 0132_partner_comparable_rules migration only ADDs
-- columns to the existing `partners` table (comp_min_count etc.) — it is
-- not a separate table. Since we're creating `partners` fresh here, those
-- columns are included directly in the CREATE TABLE below.

-- ---------------------------------------------------------------------------
-- Clients (who the tenant works FOR). One table, discriminated by client_type:
--   'person'  -> first_name/last_name/id_type/id_number
--   'company' -> company_name/reg_number/kra_pin
-- display_name is denormalised (set by the handler) so lists & search stay simple.
-- A person client may optionally link to a company client (company_client_id).
-- ---------------------------------------------------------------------------
CREATE TABLE clients (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_type       TEXT NOT NULL DEFAULT 'person' CHECK (client_type IN ('person', 'company')),
    display_name      TEXT NOT NULL,
    first_name        TEXT NOT NULL DEFAULT '',
    middle_name       TEXT NOT NULL DEFAULT '',
    last_name         TEXT NOT NULL DEFAULT '',
    id_type           TEXT NOT NULL DEFAULT 'id' CHECK (id_type IN ('id', 'passport')),
    id_number         TEXT NOT NULL DEFAULT '',
    company_name      TEXT NOT NULL DEFAULT '',
    reg_number        TEXT NOT NULL DEFAULT '',
    kra_pin           TEXT NOT NULL DEFAULT '',
    email             TEXT NOT NULL DEFAULT '',
    phone             TEXT NOT NULL DEFAULT '',
    address           TEXT NOT NULL DEFAULT '',
    notes             TEXT NOT NULL DEFAULT '',
    company_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    code              TEXT NOT NULL DEFAULT '',
    created_by_name   TEXT NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ,
    deleted_by_name   TEXT NOT NULL DEFAULT '',
    delete_reason     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_clients_tenant ON clients (tenant_id);
CREATE INDEX idx_clients_deleted_at ON clients (deleted_at);

-- ---------------------------------------------------------------------------
-- Partners (external organisations the tenant collaborates with, e.g. banks
-- / SACCOs). Includes type (0131), settings (0114) and comparable-acceptance
-- rules (0132) columns from propsense, folded directly into the base table.
-- ---------------------------------------------------------------------------
CREATE TABLE partners (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                   TEXT NOT NULL,
    logo_url               TEXT NOT NULL DEFAULT '',
    industry               TEXT NOT NULL DEFAULT '',
    partnership_model      TEXT NOT NULL DEFAULT '',
    status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    address                TEXT NOT NULL DEFAULT '',
    town                   TEXT NOT NULL DEFAULT '',
    country                TEXT NOT NULL DEFAULT 'Kenya',
    contact_name           TEXT NOT NULL DEFAULT '',
    contact_title          TEXT NOT NULL DEFAULT '',
    work_email             TEXT NOT NULL DEFAULT '',
    phone_mobile           TEXT NOT NULL DEFAULT '',
    phone_office           TEXT NOT NULL DEFAULT '',
    notes                  TEXT NOT NULL DEFAULT '',
    code                   TEXT NOT NULL DEFAULT '',
    -- type: bank, microfinance, sacco, insurer, law firm, developer, individual, other
    type                   TEXT NOT NULL DEFAULT '',
    -- per-partner settings (0114): 0 = use firm default
    sla_days               INT NOT NULL DEFAULT 0,
    default_template_id    UUID,
    mileage_rate_per_km    BIGINT NOT NULL DEFAULT 0,
    -- per-partner comparable acceptance rules (0132): 0 / false = no rule
    comp_min_count         INT NOT NULL DEFAULT 0,
    comp_max_age_months    INT NOT NULL DEFAULT 0,
    comp_max_radius_km     INT NOT NULL DEFAULT 0,
    comp_max_variance_pct  INT NOT NULL DEFAULT 0,
    comp_actual_sales_only BOOLEAN NOT NULL DEFAULT false,
    created_by_name        TEXT NOT NULL DEFAULT '',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at             TIMESTAMPTZ,
    deleted_by_name        TEXT NOT NULL DEFAULT '',
    delete_reason          TEXT NOT NULL DEFAULT '',
    UNIQUE (tenant_id, name)
);
CREATE INDEX idx_partners_tenant ON partners (tenant_id);
CREATE INDEX idx_partners_deleted_at ON partners (deleted_at);

-- ---------------------------------------------------------------------------
-- Partner branches: a partner (bank/SACCO) has many branches.
-- ---------------------------------------------------------------------------
CREATE TABLE partner_branches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    partner_id      UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    town            TEXT NOT NULL DEFAULT '',
    phone           TEXT NOT NULL DEFAULT '',
    email           TEXT NOT NULL DEFAULT '',
    created_by_name TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    deleted_by_name TEXT NOT NULL DEFAULT '',
    delete_reason   TEXT NOT NULL DEFAULT '',
    UNIQUE (partner_id, name)
);
CREATE INDEX idx_partner_branches_tenant ON partner_branches (tenant_id);
CREATE INDEX idx_partner_branches_partner ON partner_branches (partner_id);
CREATE INDEX idx_partner_branches_deleted_at ON partner_branches (deleted_at);

-- ---------------------------------------------------------------------------
-- Partner contacts: contact persons under a partner (one-to-many). Distinct
-- from MojaCRM's `contacts` table (Directory module, belongs to customers).
-- ---------------------------------------------------------------------------
CREATE TABLE partner_contacts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    partner_id        UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    first_name        TEXT NOT NULL DEFAULT '',
    middle_name       TEXT NOT NULL DEFAULT '',
    last_name         TEXT NOT NULL DEFAULT '',
    title             TEXT NOT NULL DEFAULT '',
    email             TEXT NOT NULL DEFAULT '',
    phone             TEXT NOT NULL DEFAULT '',
    whatsapp          TEXT NOT NULL DEFAULT '',
    preferred_channel TEXT NOT NULL DEFAULT 'email' CHECK (preferred_channel IN ('email', 'phone', 'whatsapp')),
    is_active         BOOLEAN NOT NULL DEFAULT true,
    inactive_reason   TEXT NOT NULL DEFAULT '',
    created_by_name   TEXT NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ,
    deleted_by_name   TEXT NOT NULL DEFAULT '',
    delete_reason     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_partner_contacts_tenant ON partner_contacts (tenant_id);
CREATE INDEX idx_partner_contacts_partner ON partner_contacts (partner_id);
CREATE INDEX idx_partner_contacts_deleted_at ON partner_contacts (deleted_at);

-- ---------------------------------------------------------------------------
-- Partner requirements: per-partner requirement packs (a bank/partner's
-- mandatory report requirements). NOTE: propsense also links these to a
-- per-job `instruction_requirement_status` table; that table (and its
-- ListForInstruction/SetStatus endpoints) depends on propsense's
-- `instructions` job register, which is out of scope for this phase and
-- does not exist in MojaCRM yet. Only the partner-scoped requirement pack
-- CRUD is ported here.
-- ---------------------------------------------------------------------------
CREATE TABLE partner_requirements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    partner_id      UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    label           TEXT NOT NULL,
    detail          TEXT NOT NULL DEFAULT '',
    kind            TEXT NOT NULL DEFAULT 'check' CHECK (kind IN ('check', 'appendix')),
    sort_order      INT NOT NULL DEFAULT 0,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_by_name TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_partner_requirements_tenant ON partner_requirements (tenant_id);
CREATE INDEX idx_partner_requirements_partner ON partner_requirements (partner_id) WHERE active;

-- ---------------------------------------------------------------------------
-- Partner appendix templates: per-partner report appendix templates (a
-- fillable form a bank/partner requires, e.g. an Environmental & Social
-- appendix). NOTE: propsense also stamps a filled snapshot of these onto its
-- `reports` table (appendix_forms column); reports don't exist in MojaCRM
-- yet, so that column is not ported in this phase.
-- ---------------------------------------------------------------------------
CREATE TABLE partner_appendix_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    partner_id      UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    fields          JSONB NOT NULL DEFAULT '[]', -- [{label, type: text|textarea|checkbox}]
    sort_order      INT NOT NULL DEFAULT 0,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_by_name TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_partner_appendix_templates_tenant ON partner_appendix_templates (tenant_id);
CREATE INDEX idx_partner_appendix_templates_partner ON partner_appendix_templates (partner_id) WHERE active;

-- ---------------------------------------------------------------------------
-- Permission catalog additions (role_permissions assignment for existing
-- tenants' system roles is handled in Go via internal/rbac, not here).
-- ---------------------------------------------------------------------------
INSERT INTO permissions (key, description) VALUES
    ('clients:read',   'View clients'),
    ('clients:write',  'Create and edit clients'),
    ('clients:delete', 'Delete clients'),
    ('partners:read',   'View partners'),
    ('partners:write',  'Create and edit partners'),
    ('partners:delete', 'Delete partners');
