-- Partner contact persons. Distinct from MojaCRM's `contacts` table
-- (Directory module, belongs to customers) — see 0006_clients_partners.up.sql.
-- Explicit column lists keep deleted_* (internal audit) out of returned rows.

-- name: ListContactsByPartner :many
SELECT id, tenant_id, partner_id, first_name, middle_name, last_name, title,
       email, phone, whatsapp, preferred_channel, is_active, inactive_reason,
       created_at, created_by_name
FROM partner_contacts
WHERE partner_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
ORDER BY is_active DESC, last_name, first_name;

-- name: CreatePartnerContact :one
INSERT INTO partner_contacts (
    tenant_id, partner_id, first_name, middle_name, last_name, title,
    email, phone, whatsapp, preferred_channel, is_active, inactive_reason, created_by_name
) VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11, $12, $13
)
RETURNING id, tenant_id, partner_id, first_name, middle_name, last_name, title,
          email, phone, whatsapp, preferred_channel, is_active, inactive_reason,
          created_at, created_by_name;

-- name: UpdatePartnerContact :one
UPDATE partner_contacts SET
    first_name = $3,
    middle_name = $4,
    last_name = $5,
    title = $6,
    email = $7,
    phone = $8,
    whatsapp = $9,
    preferred_channel = $10,
    is_active = $11,
    inactive_reason = $12,
    updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING id, tenant_id, partner_id, first_name, middle_name, last_name, title,
          email, phone, whatsapp, preferred_channel, is_active, inactive_reason,
          created_at, created_by_name;

-- name: DeletePartnerContact :exec
UPDATE partner_contacts SET deleted_at = now(), deleted_by_name = $3, delete_reason = $4
WHERE id = $1 AND tenant_id = $2;

-- name: RestorePartnerContact :exec
UPDATE partner_contacts SET deleted_at = NULL, deleted_by_name = '', delete_reason = ''
WHERE id = $1 AND tenant_id = $2;

-- name: PurgePartnerContact :exec
DELETE FROM partner_contacts WHERE id = $1 AND tenant_id = $2;
