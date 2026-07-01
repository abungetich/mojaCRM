-- name: CreateCustomer :one
INSERT INTO customers (
    tenant_id, customer_type, status, segment, source, account_owner_id,
    organization_name, legal_name, trading_name, registration_number, tax_pin, industry, organization_size,
    first_name, middle_name, last_name, display_name, id_number, date_of_birth, gender, occupation,
    website, description, primary_email, primary_phone, alternative_phone, address, country, state, city
) VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11, $12, $13,
    $14, $15, $16, $17, $18, $19, $20, $21,
    $22, $23, $24, $25, $26, $27, $28, $29, $30
)
RETURNING *;

-- name: UpdateCustomer :one
UPDATE customers SET
    segment = $3,
    source = $4,
    organization_name = $5,
    legal_name = $6,
    trading_name = $7,
    registration_number = $8,
    tax_pin = $9,
    industry = $10,
    organization_size = $11,
    first_name = $12,
    middle_name = $13,
    last_name = $14,
    display_name = $15,
    id_number = $16,
    date_of_birth = $17,
    gender = $18,
    occupation = $19,
    website = $20,
    description = $21,
    primary_email = $22,
    primary_phone = $23,
    alternative_phone = $24,
    address = $25,
    country = $26,
    state = $27,
    city = $28,
    updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: GetCustomerByID :one
SELECT c.*, u.name AS account_owner_name
FROM customers c
LEFT JOIN users u ON u.id = c.account_owner_id
WHERE c.id = $1 AND c.tenant_id = $2;

-- name: ListCustomers :many
SELECT c.*, u.name AS account_owner_name
FROM customers c
LEFT JOIN users u ON u.id = c.account_owner_id
WHERE c.tenant_id = $1
  AND ($2::text = '' OR c.status = $2)
  AND ($3::text = '' OR c.customer_type = $3)
  AND ($4::text = '' OR c.segment = $4)
  AND (
    $5::text = '' OR
    c.organization_name ILIKE '%' || $5 || '%' OR
    c.trading_name ILIKE '%' || $5 || '%' OR
    c.first_name ILIKE '%' || $5 || '%' OR
    c.last_name ILIKE '%' || $5 || '%' OR
    c.display_name ILIKE '%' || $5 || '%' OR
    c.primary_email ILIKE '%' || $5 || '%' OR
    c.primary_phone ILIKE '%' || $5 || '%'
  )
ORDER BY c.created_at DESC
LIMIT $6 OFFSET $7;

-- name: CountCustomers :one
SELECT count(*)
FROM customers c
WHERE c.tenant_id = $1
  AND ($2::text = '' OR c.status = $2)
  AND ($3::text = '' OR c.customer_type = $3)
  AND ($4::text = '' OR c.segment = $4)
  AND (
    $5::text = '' OR
    c.organization_name ILIKE '%' || $5 || '%' OR
    c.trading_name ILIKE '%' || $5 || '%' OR
    c.first_name ILIKE '%' || $5 || '%' OR
    c.last_name ILIKE '%' || $5 || '%' OR
    c.display_name ILIKE '%' || $5 || '%' OR
    c.primary_email ILIKE '%' || $5 || '%' OR
    c.primary_phone ILIKE '%' || $5 || '%'
  );

-- name: SetCustomerStatus :one
UPDATE customers SET status = $3, archive_reason = NULL, archived_at = NULL, updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: ArchiveCustomer :one
UPDATE customers SET status = 'archived', archive_reason = $3, archived_at = now(), updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: RestoreCustomer :one
UPDATE customers SET status = 'active', archive_reason = NULL, archived_at = NULL, updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: AssignAccountOwner :one
UPDATE customers SET account_owner_id = $3, updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteCustomer :exec
DELETE FROM customers WHERE id = $1 AND tenant_id = $2;

-- name: ListTags :many
SELECT * FROM tags WHERE tenant_id = $1 ORDER BY name ASC;

-- name: UpsertTag :one
INSERT INTO tags (tenant_id, name) VALUES ($1, $2)
ON CONFLICT (tenant_id, name) DO UPDATE SET name = EXCLUDED.name
RETURNING *;

-- name: AddTagToCustomer :exec
INSERT INTO customer_tags (customer_id, tag_id) VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: RemoveTagFromCustomer :exec
DELETE FROM customer_tags WHERE customer_id = $1 AND tag_id = $2;

-- name: ListCustomerTags :many
SELECT t.* FROM tags t
JOIN customer_tags ct ON ct.tag_id = t.id
WHERE ct.customer_id = $1
ORDER BY t.name ASC;

-- name: CreateCustomerNote :one
INSERT INTO customer_notes (tenant_id, customer_id, author_id, body)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListCustomerNotes :many
SELECT n.*, u.name AS author_name
FROM customer_notes n
LEFT JOIN users u ON u.id = n.author_id
WHERE n.customer_id = $1
ORDER BY n.created_at DESC;
