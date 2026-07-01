-- name: ListBranchesByPartner :many
SELECT * FROM partner_branches
WHERE partner_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
ORDER BY name;

-- name: CreateBranch :one
INSERT INTO partner_branches (tenant_id, partner_id, name, town, phone, email, created_by_name)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdateBranch :one
UPDATE partner_branches SET
    name = $3,
    town = $4,
    phone = $5,
    email = $6,
    updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteBranch :exec
UPDATE partner_branches SET deleted_at = now(), deleted_by_name = $3, delete_reason = $4
WHERE id = $1 AND tenant_id = $2;

-- name: RestoreBranch :exec
UPDATE partner_branches SET deleted_at = NULL, deleted_by_name = '', delete_reason = ''
WHERE id = $1 AND tenant_id = $2;

-- name: PurgeBranch :exec
DELETE FROM partner_branches WHERE id = $1 AND tenant_id = $2;
