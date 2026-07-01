-- name: ListPartners :many
SELECT * FROM partners
WHERE tenant_id = $1 AND deleted_at IS NULL
  AND ($2::text = '' OR status = $2)
  AND ($3::text = '' OR type = $3)
  AND (
    $4::text = '' OR
    name ILIKE '%' || $4 || '%' OR
    work_email ILIKE '%' || $4 || '%' OR
    contact_name ILIKE '%' || $4 || '%'
  )
ORDER BY name
LIMIT $5 OFFSET $6;

-- name: CountPartners :one
SELECT count(*) FROM partners
WHERE tenant_id = $1 AND deleted_at IS NULL
  AND ($2::text = '' OR status = $2)
  AND ($3::text = '' OR type = $3)
  AND (
    $4::text = '' OR
    name ILIKE '%' || $4 || '%' OR
    work_email ILIKE '%' || $4 || '%' OR
    contact_name ILIKE '%' || $4 || '%'
  );

-- name: GetPartner :one
SELECT * FROM partners WHERE id = $1 AND tenant_id = $2;

-- name: CreatePartner :one
INSERT INTO partners (
    tenant_id, name, logo_url, industry, partnership_model, status,
    address, town, country,
    contact_name, contact_title, work_email,
    phone_mobile, phone_office, notes, created_by_name,
    code, sla_days, default_template_id, mileage_rate_per_km, type
) VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9,
    $10, $11, $12,
    $13, $14, $15, $16,
    $17, $18, $19, $20, $21
)
RETURNING *;

-- name: UpdatePartner :one
UPDATE partners SET
    name = $3,
    logo_url = $4,
    industry = $5,
    partnership_model = $6,
    status = $7,
    address = $8,
    town = $9,
    country = $10,
    contact_name = $11,
    contact_title = $12,
    work_email = $13,
    phone_mobile = $14,
    phone_office = $15,
    notes = $16,
    code = $17,
    sla_days = $18,
    default_template_id = $19,
    mileage_rate_per_km = $20,
    type = $21,
    updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: SetPartnerComparableRules :exec
UPDATE partners SET
    comp_min_count = $3,
    comp_max_age_months = $4,
    comp_max_radius_km = $5,
    comp_max_variance_pct = $6,
    comp_actual_sales_only = $7,
    updated_at = now()
WHERE id = $1 AND tenant_id = $2;

-- name: DeletePartner :exec
UPDATE partners SET deleted_at = now(), deleted_by_name = $3, delete_reason = $4
WHERE id = $1 AND tenant_id = $2;

-- name: RestorePartner :exec
UPDATE partners SET deleted_at = NULL, deleted_by_name = '', delete_reason = ''
WHERE id = $1 AND tenant_id = $2;

-- name: PurgePartner :exec
DELETE FROM partners WHERE id = $1 AND tenant_id = $2;
