CREATE TABLE customer_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    communication_type TEXT NOT NULL CHECK (communication_type IN ('call', 'email', 'sms', 'whatsapp', 'meeting', 'note', 'task_followup', 'system_message')),
    direction TEXT NOT NULL DEFAULT 'outgoing' CHECK (direction IN ('incoming', 'outgoing', 'internal')),
    subject TEXT NOT NULL DEFAULT '',
    message_body TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'sent', 'delivered', 'failed', 'completed')),
    communication_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    follow_up_required BOOLEAN NOT NULL DEFAULT false,
    follow_up_date TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comms_tenant_customer ON customer_communications(tenant_id, customer_id, communication_date DESC);
CREATE INDEX idx_comms_tenant_date ON customer_communications(tenant_id, communication_date DESC);
CREATE INDEX idx_comms_followups_due ON customer_communications(tenant_id, follow_up_date) WHERE follow_up_required = true;

INSERT INTO permissions (key, description) VALUES
    ('communications:read', 'View customer communications'),
    ('communications:write', 'Log and manage customer communications');
