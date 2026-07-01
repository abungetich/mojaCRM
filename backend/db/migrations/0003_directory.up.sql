-- Directory module: customers (organizations or individuals), their
-- contacts, tags, and internal notes.

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_type TEXT NOT NULL CHECK (customer_type IN ('organization', 'individual')),
    status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'active', 'dormant', 'archived', 'blacklisted')),
    segment TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    account_owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    archive_reason TEXT,
    archived_at TIMESTAMPTZ,

    -- Organization fields
    organization_name TEXT NOT NULL DEFAULT '',
    legal_name TEXT NOT NULL DEFAULT '',
    trading_name TEXT NOT NULL DEFAULT '',
    registration_number TEXT NOT NULL DEFAULT '',
    tax_pin TEXT NOT NULL DEFAULT '',
    industry TEXT NOT NULL DEFAULT '',
    organization_size TEXT NOT NULL DEFAULT '',

    -- Individual fields
    first_name TEXT NOT NULL DEFAULT '',
    middle_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    display_name TEXT NOT NULL DEFAULT '',
    id_number TEXT NOT NULL DEFAULT '',
    date_of_birth DATE,
    gender TEXT NOT NULL DEFAULT '',
    occupation TEXT NOT NULL DEFAULT '',

    -- Shared contact/profile fields
    website TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    primary_email TEXT NOT NULL DEFAULT '',
    primary_phone TEXT NOT NULL DEFAULT '',
    alternative_phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_tenant_status ON customers(tenant_id, status);
CREATE INDEX idx_customers_tenant_type ON customers(tenant_id, customer_type);

CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    job_title TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    alternative_phone TEXT NOT NULL DEFAULT '',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    communication_preference TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_customer ON contacts(customer_id);

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);

CREATE TABLE customer_tags (
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (customer_id, tag_id)
);

CREATE TABLE customer_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);

INSERT INTO permissions (key, description) VALUES
    ('customers:read', 'View directory customers'),
    ('customers:write', 'Create and edit directory customers'),
    ('customers:delete', 'Delete or archive directory customers');
