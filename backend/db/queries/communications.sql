-- name: CreateCommunication :one
INSERT INTO customer_communications (
    tenant_id, customer_id, contact_id, communication_type, direction, subject,
    message_body, status, communication_date, follow_up_required, follow_up_date,
    created_by, assigned_to
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
)
RETURNING *;

-- name: ListCommunicationsByCustomer :many
SELECT c.*,
    ct.first_name AS contact_first_name, ct.last_name AS contact_last_name,
    creator.name AS created_by_name,
    assignee.name AS assigned_to_name
FROM customer_communications c
LEFT JOIN contacts ct ON ct.id = c.contact_id
LEFT JOIN users creator ON creator.id = c.created_by
LEFT JOIN users assignee ON assignee.id = c.assigned_to
WHERE c.customer_id = $1
ORDER BY c.communication_date DESC;

-- name: ListCommunications :many
SELECT c.*,
    cu.display_name AS customer_name,
    ct.first_name AS contact_first_name, ct.last_name AS contact_last_name,
    creator.name AS created_by_name,
    assignee.name AS assigned_to_name
FROM customer_communications c
JOIN customers cu ON cu.id = c.customer_id
LEFT JOIN contacts ct ON ct.id = c.contact_id
LEFT JOIN users creator ON creator.id = c.created_by
LEFT JOIN users assignee ON assignee.id = c.assigned_to
WHERE c.tenant_id = $1
  AND ($2::text = '' OR c.communication_type = $2)
  AND ($3::text = '' OR c.status = $3)
  AND ($4::text = '' OR c.follow_up_required = ($4::boolean))
  AND (
    $5::text = '' OR
    cu.display_name ILIKE '%' || $5 || '%' OR
    c.subject ILIKE '%' || $5 || '%' OR
    c.message_body ILIKE '%' || $5 || '%'
  )
ORDER BY c.communication_date DESC
LIMIT $6 OFFSET $7;

-- name: CountCommunications :one
SELECT count(*)
FROM customer_communications c
JOIN customers cu ON cu.id = c.customer_id
WHERE c.tenant_id = $1
  AND ($2::text = '' OR c.communication_type = $2)
  AND ($3::text = '' OR c.status = $3)
  AND ($4::text = '' OR c.follow_up_required = ($4::boolean))
  AND (
    $5::text = '' OR
    cu.display_name ILIKE '%' || $5 || '%' OR
    c.subject ILIKE '%' || $5 || '%' OR
    c.message_body ILIKE '%' || $5 || '%'
  );

-- name: ListFollowUpsDue :many
SELECT c.*,
    cu.display_name AS customer_name,
    ct.first_name AS contact_first_name, ct.last_name AS contact_last_name,
    creator.name AS created_by_name,
    assignee.name AS assigned_to_name
FROM customer_communications c
JOIN customers cu ON cu.id = c.customer_id
LEFT JOIN contacts ct ON ct.id = c.contact_id
LEFT JOIN users creator ON creator.id = c.created_by
LEFT JOIN users assignee ON assignee.id = c.assigned_to
WHERE c.tenant_id = $1 AND c.follow_up_required = true
ORDER BY c.follow_up_date ASC NULLS LAST;

-- name: GetCommunicationByID :one
SELECT * FROM customer_communications WHERE id = $1 AND tenant_id = $2;

-- name: UpdateCommunicationStatus :one
UPDATE customer_communications SET status = $3, updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: CompleteFollowUp :one
UPDATE customer_communications SET follow_up_required = false, updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteCommunication :exec
DELETE FROM customer_communications WHERE id = $1 AND tenant_id = $2;
