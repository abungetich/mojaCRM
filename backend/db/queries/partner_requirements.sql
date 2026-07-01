-- Per-partner requirement packs. Job-level completion tracking
-- (instruction_requirement_status in propsense) is out of scope here since
-- MojaCRM has no `instructions` table yet — see 0006_clients_partners.up.sql.

-- name: ListPartnerRequirements :many
SELECT * FROM partner_requirements
WHERE partner_id = $1 AND tenant_id = $2 AND active = true
ORDER BY sort_order, created_at;

-- name: CreatePartnerRequirement :one
INSERT INTO partner_requirements (tenant_id, partner_id, label, detail, kind, sort_order, created_by_name)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdatePartnerRequirement :exec
UPDATE partner_requirements SET label = $3, detail = $4, kind = $5, sort_order = $6
WHERE id = $1 AND tenant_id = $2;

-- name: DeletePartnerRequirement :exec
UPDATE partner_requirements SET active = false WHERE id = $1 AND tenant_id = $2;
