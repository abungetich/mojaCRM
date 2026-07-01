-- name: ListOffices :many
SELECT * FROM offices
WHERE tenant_id = $1 AND deleted_at IS NULL
ORDER BY is_main DESC, name;

-- name: CreateOffice :one
INSERT INTO offices (tenant_id, name, code, is_main, address, town, phone, email, created_by_name)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: UpdateOffice :one
UPDATE offices SET name = $3, code = $4, is_main = $5, address = $6, town = $7, phone = $8, email = $9, updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteOffice :exec
UPDATE offices SET deleted_at = now(), deleted_by_name = $3, delete_reason = $4
WHERE id = $1 AND tenant_id = $2;

-- name: RestoreOffice :exec
UPDATE offices SET deleted_at = NULL, deleted_by_name = '', delete_reason = ''
WHERE id = $1 AND tenant_id = $2;

-- name: PurgeOffice :exec
DELETE FROM offices WHERE id = $1 AND tenant_id = $2;
