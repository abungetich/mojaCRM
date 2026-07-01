-- name: ListClients :many
SELECT c.*, comp.display_name AS company_client_name
FROM clients c
LEFT JOIN clients comp ON comp.id = c.company_client_id
WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
  AND ($2::text = '' OR c.client_type = $2)
  AND (
    $3::text = '' OR
    c.display_name ILIKE '%' || $3 || '%' OR
    c.company_name ILIKE '%' || $3 || '%' OR
    c.email ILIKE '%' || $3 || '%' OR
    c.phone ILIKE '%' || $3 || '%'
  )
ORDER BY c.display_name
LIMIT $4 OFFSET $5;

-- name: CountClients :one
SELECT count(*)
FROM clients c
WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
  AND ($2::text = '' OR c.client_type = $2)
  AND (
    $3::text = '' OR
    c.display_name ILIKE '%' || $3 || '%' OR
    c.company_name ILIKE '%' || $3 || '%' OR
    c.email ILIKE '%' || $3 || '%' OR
    c.phone ILIKE '%' || $3 || '%'
  );

-- name: GetClient :one
SELECT c.*, comp.display_name AS company_client_name
FROM clients c
LEFT JOIN clients comp ON comp.id = c.company_client_id
WHERE c.id = $1 AND c.tenant_id = $2;

-- name: CreateClient :one
INSERT INTO clients (
    tenant_id, client_type, display_name, first_name, middle_name, last_name,
    id_type, id_number, company_name, reg_number, kra_pin,
    email, phone, address, notes, company_client_id, code, created_by_name
) VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11,
    $12, $13, $14, $15, $16, $17, $18
)
RETURNING *;

-- name: UpdateClient :one
UPDATE clients SET
    client_type = $3,
    display_name = $4,
    first_name = $5,
    middle_name = $6,
    last_name = $7,
    id_type = $8,
    id_number = $9,
    company_name = $10,
    reg_number = $11,
    kra_pin = $12,
    email = $13,
    phone = $14,
    address = $15,
    notes = $16,
    company_client_id = $17,
    code = $18,
    updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteClient :exec
UPDATE clients SET deleted_at = now(), deleted_by_name = $3, delete_reason = $4
WHERE id = $1 AND tenant_id = $2;
