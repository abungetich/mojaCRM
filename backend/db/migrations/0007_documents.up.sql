-- Document Vault module, ported from propsense (waterboy backend:
-- 0091_company_documents, 0092_document_fields, 0093_document_versions).
--
-- propsense scopes these tables via Postgres RLS + current_tenant_id(); as with
-- clients/partners (0006), MojaCRM has no RLS, so every table carries an
-- explicit tenant_id column and every query filters on it in application code.
--
-- propsense stores the uploaded file as a base64 data URL (file_name,
-- content_type, size_bytes, data_url columns) since it has no cloud storage.
-- MojaCRM doesn't have file upload infrastructure yet either, and per the
-- Phase 1 precedent (Partner.logo_url), we don't build one here: the file is
-- a single plain-text `file_url` column (+ an informational `file_name`
-- label), not stored binary. content_type/size_bytes are dropped since they
-- only mattered for byte storage/serving, which no longer happens here.
--
-- propsense hard-deletes company_documents (no deleted_at/soft-delete
-- columns, unlike clients/partners in 0006) — that behaviour is preserved
-- as-is rather than invented.

-- ---------------------------------------------------------------------------
-- Company documents: company-wide or per-staff documents (staff manual,
-- templates, policies, certificates...), with optional expiry + renewal lead
-- time and a version number. owner_user_id is null for a company-wide doc.
-- ---------------------------------------------------------------------------
CREATE TABLE company_documents (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    category          TEXT NOT NULL DEFAULT '',
    doc_number        TEXT NOT NULL DEFAULT '',
    issuer            TEXT NOT NULL DEFAULT '',
    description       TEXT NOT NULL DEFAULT '',
    owner_user_id     UUID REFERENCES users(id) ON DELETE SET NULL, -- null = company-wide
    owner_name        TEXT NOT NULL DEFAULT '',                     -- denormalised for display
    file_name         TEXT NOT NULL DEFAULT '',
    file_url          TEXT NOT NULL DEFAULT '',
    issue_date        DATE,
    expiry_date       DATE,
    renewal_lead_days INTEGER NOT NULL DEFAULT 30,
    on_report         BOOLEAN NOT NULL DEFAULT false,               -- attach to reports?
    report_mode       TEXT NOT NULL DEFAULT 'always' CHECK (report_mode IN ('always', 'author')),
    version_no        INTEGER NOT NULL DEFAULT 1,
    active            BOOLEAN NOT NULL DEFAULT true,
    created_by_name   TEXT NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_documents_tenant ON company_documents (tenant_id, expiry_date);

-- ---------------------------------------------------------------------------
-- Document versions: superseded file/date snapshots, archived whenever a new
-- version is uploaded (see AddVersion in the handler).
-- ---------------------------------------------------------------------------
CREATE TABLE document_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id     UUID NOT NULL REFERENCES company_documents(id) ON DELETE CASCADE,
    version_no      INTEGER NOT NULL,
    file_name       TEXT NOT NULL DEFAULT '',
    file_url        TEXT NOT NULL DEFAULT '',
    issue_date      DATE,
    expiry_date     DATE,
    created_by_name TEXT NOT NULL DEFAULT '',
    archived_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_document_versions_tenant ON document_versions (tenant_id);
CREATE INDEX idx_document_versions_doc ON document_versions (document_id, version_no DESC);

-- ---------------------------------------------------------------------------
-- Permission catalog additions (role_permissions assignment for existing
-- tenants' system roles is handled in Go via internal/rbac, not here).
-- ---------------------------------------------------------------------------
INSERT INTO permissions (key, description) VALUES
    ('documents:read',   'View documents'),
    ('documents:write',  'Create and edit documents'),
    ('documents:delete', 'Delete documents');
