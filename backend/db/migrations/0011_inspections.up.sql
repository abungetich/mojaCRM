-- 0011_inspections.up.sql
-- Inspections / field visits, ported from propsense (waterboy backend).
--
-- propsense schedules an "inspection" against a valuation job
-- (instruction_id), captures the field officer's GPS on Arrive/Depart, and
-- compares it to the property's coordinates (captured on the job's report)
-- as a geofence "field control" — warning but never blocking when the
-- officer is far from the property.
--
-- MojaCRM deliberately has no Instructions/jobs module and no
-- report/property-location concept. Per explicit product decision, this
-- becomes a general "field visit" scheduled against a CLIENT instead of a
-- job (e.g. "site visit to Acme Corp on the 5th"). The geofence distance/
-- flag calculation has no equivalent without a property location to compare
-- against, so it is dropped; arrival/departure GPS is still captured for
-- the record (arrival_lat/lng, departure_lat/lng) without a distance check.
--
-- propsense scopes these tables via Postgres RLS + current_tenant_id();
-- MojaCRM has no RLS, so every table carries an explicit tenant_id column
-- and every query filters on it in application code (see db/queries).
--
-- No soft-delete columns here (matching propsense, which has none for
-- inspections either) — a scheduled visit that needs to go away is
-- cancelled (status = 'cancelled') via the Cancel action; a genuine mistake
-- can be hard-deleted. This intentionally keeps inspections out of the
-- generic Archive module (see archive.sql), same as partner_requirements /
-- partner_appendix_templates which use an `active` flag instead.

CREATE TABLE inspections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'arrived', 'completed', 'cancelled')),
    scheduled_at    TIMESTAMPTZ,
    contact_name    TEXT NOT NULL DEFAULT '',
    contact_phone   TEXT NOT NULL DEFAULT '',
    notes           TEXT NOT NULL DEFAULT '',
    transport_mode  TEXT NOT NULL DEFAULT '',
    arrived_at      TIMESTAMPTZ,
    arrival_lat     DOUBLE PRECISION NOT NULL DEFAULT 0,
    arrival_lng     DOUBLE PRECISION NOT NULL DEFAULT 0,
    departed_at     TIMESTAMPTZ,
    departure_lat   DOUBLE PRECISION NOT NULL DEFAULT 0,
    departure_lng   DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_by_name TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inspections_tenant_client ON inspections (tenant_id, client_id, scheduled_at);
CREATE INDEX idx_inspections_tenant_schedule ON inspections (tenant_id, status, scheduled_at);

-- ---------------------------------------------------------------------------
-- Inspection photos: geotagged field photos captured during a visit (site
-- condition evidence). propsense flows these into the report's
-- photographs/appendix; MojaCRM has no reports module, so they simply live
-- against the inspection (and its client) as a record.
-- ---------------------------------------------------------------------------
CREATE TABLE inspection_photos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    inspection_id   UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    caption         TEXT NOT NULL DEFAULT '',
    data_url        TEXT NOT NULL,
    lat             DOUBLE PRECISION NOT NULL DEFAULT 0,
    lng             DOUBLE PRECISION NOT NULL DEFAULT 0,
    taken_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_name TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inspection_photos_client ON inspection_photos (tenant_id, client_id, taken_at);
CREATE INDEX idx_inspection_photos_inspection ON inspection_photos (inspection_id);

-- ---------------------------------------------------------------------------
-- Permission catalog additions (role_permissions assignment for existing
-- tenants' system roles is handled in Go via internal/rbac, not here).
-- ---------------------------------------------------------------------------
INSERT INTO permissions (key, description) VALUES
    ('inspections:read',  'View inspections / field visits'),
    ('inspections:write', 'Schedule, update and manage inspections / field visits');
