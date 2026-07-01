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
