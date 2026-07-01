-- name: ListAppendixTemplatesForPartner :many
SELECT * FROM partner_appendix_templates
WHERE partner_id = $1 AND tenant_id = $2 AND active = true
ORDER BY sort_order, created_at;

-- name: CreateAppendixTemplate :one
INSERT INTO partner_appendix_templates (tenant_id, partner_id, name, description, fields, sort_order, created_by_name)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdateAppendixTemplate :one
UPDATE partner_appendix_templates SET
    name = $3,
    description = $4,
    fields = $5,
    sort_order = $6
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteAppendixTemplate :exec
UPDATE partner_appendix_templates SET active = false WHERE id = $1 AND tenant_id = $2;
