-- Tenders & Pre-Qualification module, ported from propsense (waterboy backend).
-- A central register of bid opportunities with a granular stage workflow,
-- requirements checklist, documents, security/fees, deadline reminders,
-- win/loss tracking, and reusable letter templates.
--
-- propsense scopes these tables via Postgres RLS + current_tenant_id();
-- MojaCRM has no RLS, so every table carries an explicit tenant_id column
-- and every query filters on it in application code (see db/queries),
-- matching the clients/partners module (0006_clients_partners).
--
-- Note on "evaluation": it is just one stage value in the workflow below
-- (watching -> preparing -> submitted -> evaluation -> shortlisted ->
-- awarded/unsuccessful/withdrawn), not a separate feature/module. Ported
-- faithfully, unchanged from propsense.
--
-- Note on reminders: propsense runs a periodic cross-tenant ticker
-- (intake.StartTenderReminders) that scans reminded_7d_at/reminded_1d_at and
-- creates in-app notifications via a `notifications` table. MojaCRM has no
-- notifications table/mechanism yet, so that scanner is NOT ported here —
-- the reminded_7d_at/reminded_1d_at columns exist (for schema parity and so
-- a future notifications module can wire the scanner in without another
-- migration) but nothing writes to them yet. See tenders.go handler comments.

CREATE TABLE tenders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title               TEXT NOT NULL DEFAULT '',
    reference           TEXT NOT NULL DEFAULT '',
    issuer              TEXT NOT NULL DEFAULT '',        -- procuring entity
    type                TEXT NOT NULL DEFAULT 'tender' CHECK (type IN ('tender', 'prequalification', 'eoi')),
    category            TEXT NOT NULL DEFAULT '',
    description         TEXT NOT NULL DEFAULT '',
    stage               TEXT NOT NULL DEFAULT 'watching' CHECK (stage IN
                            ('watching', 'preparing', 'submitted', 'evaluation', 'shortlisted', 'awarded', 'unsuccessful', 'withdrawn')),
    outcome_note        TEXT NOT NULL DEFAULT '',
    submission_deadline TEXT NOT NULL DEFAULT '',        -- YYYY-MM-DD
    opening_datetime    TEXT NOT NULL DEFAULT '',        -- YYYY-MM-DDTHH:MM (display only)
    submitted_on        TEXT NOT NULL DEFAULT '',
    submission_method   TEXT NOT NULL DEFAULT '',        -- email | physical | online
    submission_address  TEXT NOT NULL DEFAULT '',
    submission_email    TEXT NOT NULL DEFAULT '',
    submission_contact  TEXT NOT NULL DEFAULT '',
    estimated_value     BIGINT NOT NULL DEFAULT 0,
    doc_fee             BIGINT NOT NULL DEFAULT 0,
    currency            TEXT NOT NULL DEFAULT 'KES',
    security_type       TEXT NOT NULL DEFAULT '',        -- bid_bond | bank_guarantee | cash | ''(none)
    security_amount     BIGINT NOT NULL DEFAULT 0,
    security_validity   TEXT NOT NULL DEFAULT '',
    owner_user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    signed              BOOLEAN NOT NULL DEFAULT false,
    requirements        JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{item, section, met}]
    stage_log           JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{at, by, from, to, note}]
    submission_log      JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{at, by, method, reference, note}]
    contact_name        TEXT NOT NULL DEFAULT '',
    contact_email       TEXT NOT NULL DEFAULT '',
    notes               TEXT NOT NULL DEFAULT '',
    reminded_7d_at      TIMESTAMPTZ,
    reminded_1d_at      TIMESTAMPTZ,
    created_by_name     TEXT NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    deleted_by_name     TEXT NOT NULL DEFAULT '',
    delete_reason       TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_tenders_tenant ON tenders (tenant_id);
CREATE INDEX idx_tenders_deleted_at ON tenders (deleted_at);

-- ---------------------------------------------------------------------------
-- Tender documents: files attached to a tender (tender doc, submission,
-- addendum, security, outcome, other). Stored as a data URL, same as
-- propsense — no separate object-storage service required.
-- ---------------------------------------------------------------------------
CREATE TABLE tender_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tender_id       UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    name            TEXT NOT NULL DEFAULT '',
    label           TEXT NOT NULL DEFAULT '',          -- e.g. "Annex A"
    kind            TEXT NOT NULL DEFAULT 'other' CHECK (kind IN ('tender', 'submission', 'addendum', 'security', 'outcome', 'other')),
    data_url        TEXT NOT NULL DEFAULT '',
    created_by_name TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tender_documents_tenant ON tender_documents (tenant_id);
CREATE INDEX idx_tender_documents_tender ON tender_documents (tender_id);

-- ---------------------------------------------------------------------------
-- Tender letters: reusable letter templates (cover/technical/financial/
-- compliance/other) with {{placeholder}} tokens, filled in client-side.
-- ---------------------------------------------------------------------------
CREATE TABLE tender_letters (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name             TEXT NOT NULL DEFAULT '',
    kind             TEXT NOT NULL DEFAULT 'cover' CHECK (kind IN ('cover', 'technical', 'financial', 'compliance', 'other')),
    template_content TEXT NOT NULL DEFAULT '',          -- plain/markdown with {{placeholders}}
    is_default       BOOLEAN NOT NULL DEFAULT false,
    created_by_name  TEXT NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ
);
CREATE INDEX idx_tender_letters_tenant ON tender_letters (tenant_id);
CREATE INDEX idx_tender_letters_deleted_at ON tender_letters (deleted_at);

-- ---------------------------------------------------------------------------
-- Permission catalog additions (role_permissions assignment for existing
-- tenants' system roles is handled in Go via internal/rbac, not here).
-- ---------------------------------------------------------------------------
INSERT INTO permissions (key, description) VALUES
    ('tenders:read',  'View tenders, tender documents and letter templates'),
    ('tenders:write', 'Create and manage tenders, documents and letters')
ON CONFLICT (key) DO NOTHING;
