-- name: CreateInspection :one
INSERT INTO inspections (
    tenant_id, client_id, scheduled_at, contact_name, contact_phone, notes, transport_mode, created_by_name
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: ListInspectionsByClient :many
SELECT * FROM inspections
WHERE tenant_id = $1 AND client_id = $2
ORDER BY COALESCE(scheduled_at, created_at) DESC;

-- name: ListInspectionsAll :many
SELECT i.*, c.display_name AS client_name
FROM inspections i
JOIN clients c ON c.id = i.client_id
WHERE i.tenant_id = $1
ORDER BY COALESCE(i.scheduled_at, i.created_at) ASC;

-- name: GetInspection :one
SELECT * FROM inspections WHERE id = $1 AND tenant_id = $2;

-- name: UpdateInspection :one
UPDATE inspections SET
    scheduled_at = $3,
    contact_name = $4,
    contact_phone = $5,
    notes = $6,
    transport_mode = $7,
    updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: ArriveInspection :one
UPDATE inspections SET
    status = 'arrived',
    arrived_at = now(),
    arrival_lat = $3,
    arrival_lng = $4,
    updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DepartInspection :one
UPDATE inspections SET
    status = 'completed',
    departed_at = now(),
    departure_lat = $3,
    departure_lng = $4,
    updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: CancelInspection :one
UPDATE inspections SET status = 'cancelled', updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteInspection :exec
DELETE FROM inspections WHERE id = $1 AND tenant_id = $2;

-- name: CreateInspectionPhoto :one
INSERT INTO inspection_photos (
    tenant_id, client_id, inspection_id, caption, data_url, lat, lng, created_by_name
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: ListInspectionPhotosByInspection :many
SELECT * FROM inspection_photos
WHERE tenant_id = $1 AND inspection_id = $2
ORDER BY taken_at;

-- name: UpdateInspectionPhotoCaption :one
UPDATE inspection_photos SET caption = $3
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteInspectionPhoto :exec
DELETE FROM inspection_photos WHERE id = $1 AND tenant_id = $2;
