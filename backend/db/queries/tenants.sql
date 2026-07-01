-- name: CreateTenant :one
INSERT INTO tenants (name, slug, plan)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetTenantBySlug :one
SELECT * FROM tenants WHERE slug = $1;

-- name: GetTenantByID :one
SELECT * FROM tenants WHERE id = $1;

-- name: ListTenants :many
SELECT * FROM tenants ORDER BY created_at DESC;

-- name: SetTenantStatus :one
UPDATE tenants SET status = $2, updated_at = now() WHERE id = $1
RETURNING *;

-- name: UpdateTenantProfile :one
UPDATE tenants SET
    name = $2,
    country = $3,
    legal_name = $4,
    registration_no = $5,
    kra_pin = $6,
    phone = $7,
    email = $8,
    website = $9,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateTenantEmailSettings :one
UPDATE tenants SET
    mail_sender_name = $2,
    mail_reply_to = $3,
    invoice_cc = $4,
    invoice_bcc = $5,
    billing_email = $6,
    updated_at = now()
WHERE id = $1
RETURNING *;
