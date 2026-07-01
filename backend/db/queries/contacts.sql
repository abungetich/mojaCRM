-- name: CreateContact :one
INSERT INTO contacts (
    tenant_id, customer_id, first_name, last_name, job_title, department,
    email, phone, alternative_phone, is_primary, communication_preference, notes, status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
)
RETURNING *;

-- name: UpdateContact :one
UPDATE contacts SET
    first_name = $3,
    last_name = $4,
    job_title = $5,
    department = $6,
    email = $7,
    phone = $8,
    alternative_phone = $9,
    communication_preference = $10,
    notes = $11,
    updated_at = now()
WHERE id = $1 AND customer_id = $2
RETURNING *;

-- name: GetContactByID :one
SELECT * FROM contacts WHERE id = $1 AND customer_id = $2;

-- name: ListContactsByCustomer :many
SELECT * FROM contacts WHERE customer_id = $1 ORDER BY is_primary DESC, created_at ASC;

-- name: UnsetPrimaryContacts :exec
UPDATE contacts SET is_primary = false, updated_at = now()
WHERE customer_id = $1 AND is_primary = true;

-- name: SetContactPrimary :one
UPDATE contacts SET is_primary = true, updated_at = now()
WHERE id = $1 AND customer_id = $2
RETURNING *;

-- name: SetContactStatus :one
UPDATE contacts SET status = $3, updated_at = now()
WHERE id = $1 AND customer_id = $2
RETURNING *;

-- name: DeleteContact :exec
DELETE FROM contacts WHERE id = $1 AND customer_id = $2;
