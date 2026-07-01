-- name: ListReferenceData :many
SELECT * FROM reference_data
WHERE tenant_id = $1 AND deleted_at IS NULL
ORDER BY category, sort_order, label, value;

-- name: ListReferenceDataByCategory :many
SELECT * FROM reference_data
WHERE tenant_id = $1 AND category = $2 AND deleted_at IS NULL
ORDER BY sort_order, label, value;

-- name: CreateReferenceData :one
INSERT INTO reference_data (tenant_id, category, value, label, sort_order, created_by_name)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: DeleteReferenceData :exec
UPDATE reference_data SET deleted_at = now() WHERE id = $1 AND tenant_id = $2;
