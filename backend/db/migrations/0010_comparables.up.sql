-- Comparables module, ported from propsense (waterboy backend).
--
-- A tenant-wide library of market evidence (property sale records) that any
-- tenant user can browse and add to — NOT owned by any single client,
-- partner or job, just a shared reference collection. This matches
-- propsense's own design, where comparables are only loosely referenced
-- FROM reports and never owned by one thing.
--
-- Ported from propsense migrations:
--   0026_comparables       -> base table (parcel_ref, size, location, comp_date,
--                              land_user, value, source, county, notes + audit cols)
--   0096_comparable_coords -> lat/lng map coordinates + contact_phone
--   0097_comparable_photos -> done_by + the comparable_photos table
--   0136_comparable_structured -> value_amount (BIGINT) / value_date (ISO) for
--                              exact price-variance / evidence-age math, alongside
--                              the free-text value/comp_date used for display
--
-- propsense scopes these rows via Postgres RLS + current_tenant_id(); MojaCRM
-- has no RLS, so tenant_id is an explicit column filtered in every query (see
-- db/queries/comparables.sql), matching the clients/partners modules.
--
-- NOT ported (deliberately out of scope for this phase):
--   - propsense's 0105_comparable_origin (origin_instruction_id FK to
--     `instructions`, auto-linking a comparable to the approved valuation it
--     was created from) — `instructions` doesn't exist in MojaCRM yet.
--   - propsense's comparable_usage table (which job/report used which
--     comparable) — it ties comparables to Instructions and Reports, neither
--     of which exist in MojaCRM yet.
-- Both are usage/origin tracking on top of the library, not the library
-- itself, so this migration builds only the comparables library (CRUD +
-- photos).

CREATE TABLE comparables (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parcel_ref      TEXT NOT NULL DEFAULT '',   -- e.g. KISUMU/MANYATTA 'B'/****
    size            TEXT NOT NULL DEFAULT '',   -- e.g. 0.05 Ha
    location        TEXT NOT NULL DEFAULT '',   -- e.g. Next to our subject
    comp_date       TEXT NOT NULL DEFAULT '',   -- free-text display date, e.g. October, 2025
    land_user       TEXT NOT NULL DEFAULT '',   -- e.g. Residential (Developed)
    value           TEXT NOT NULL DEFAULT '',   -- free-text display value, e.g. Kshs. 1,700,000/=
    value_amount    BIGINT NOT NULL DEFAULT 0,  -- structured whole-currency-unit value (0136)
    value_date      TEXT NOT NULL DEFAULT '',   -- structured ISO date (0136)
    source          TEXT NOT NULL DEFAULT '',   -- e.g. Local Estate Agent
    county          TEXT NOT NULL DEFAULT '',
    notes           TEXT NOT NULL DEFAULT '',
    lat             DOUBLE PRECISION NOT NULL DEFAULT 0,
    lng             DOUBLE PRECISION NOT NULL DEFAULT 0,
    contact_phone   TEXT NOT NULL DEFAULT '',
    done_by         TEXT NOT NULL DEFAULT '',   -- who collected the comparable
    created_by_name TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    deleted_by_name TEXT NOT NULL DEFAULT '',
    delete_reason   TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_comparables_tenant ON comparables (tenant_id);
CREATE INDEX idx_comparables_deleted_at ON comparables (deleted_at);

-- ---------------------------------------------------------------------------
-- Comparable photos: property photos attached to a comparable. MojaCRM has no
-- file upload infrastructure yet, so photo_url is a plain link the user
-- pastes in (matching how Partner.logo_url and CompanyDocument.file_url were
-- ported) rather than propsense's base64 data_url.
-- ---------------------------------------------------------------------------
CREATE TABLE comparable_photos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    comparable_id   UUID NOT NULL REFERENCES comparables(id) ON DELETE CASCADE,
    photo_url       TEXT NOT NULL DEFAULT '',
    caption         TEXT NOT NULL DEFAULT '',
    created_by_name TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comparable_photos_comparable ON comparable_photos (comparable_id, created_at);
CREATE INDEX idx_comparable_photos_tenant ON comparable_photos (tenant_id);

-- ---------------------------------------------------------------------------
-- Permission catalog additions (role_permissions assignment for existing
-- tenants' system roles is handled in Go via internal/rbac, not here).
-- ---------------------------------------------------------------------------
INSERT INTO permissions (key, description) VALUES
    ('comparables:read',  'View market comparables'),
    ('comparables:write', 'Create, edit and delete market comparables');
