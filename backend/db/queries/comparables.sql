-- name: ListComparables :many
SELECT * FROM comparables
WHERE tenant_id = $1 AND deleted_at IS NULL
  AND (
    $2::text = '' OR
    parcel_ref ILIKE '%' || $2 || '%' OR
    location ILIKE '%' || $2 || '%' OR
    county ILIKE '%' || $2 || '%' OR
    source ILIKE '%' || $2 || '%' OR
    notes ILIKE '%' || $2 || '%'
  )
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountComparables :one
SELECT count(*) FROM comparables
WHERE tenant_id = $1 AND deleted_at IS NULL
  AND (
    $2::text = '' OR
    parcel_ref ILIKE '%' || $2 || '%' OR
    location ILIKE '%' || $2 || '%' OR
    county ILIKE '%' || $2 || '%' OR
    source ILIKE '%' || $2 || '%' OR
    notes ILIKE '%' || $2 || '%'
  );

-- name: GetComparable :one
SELECT * FROM comparables WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL;

-- name: CreateComparable :one
INSERT INTO comparables (
    tenant_id, parcel_ref, size, location, comp_date, land_user, value, value_amount, value_date,
    source, county, notes, lat, lng, contact_phone, done_by, created_by_name
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9,
    $10, $11, $12, $13, $14, $15, $16, $17
)
RETURNING *;

-- name: UpdateComparable :one
UPDATE comparables SET
    parcel_ref = $3,
    size = $4,
    location = $5,
    comp_date = $6,
    land_user = $7,
    value = $8,
    value_amount = $9,
    value_date = $10,
    source = $11,
    county = $12,
    notes = $13,
    lat = $14,
    lng = $15,
    contact_phone = $16,
    done_by = $17,
    updated_at = now()
WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
RETURNING *;

-- name: DeleteComparable :exec
UPDATE comparables SET deleted_at = now(), deleted_by_name = $3, delete_reason = $4
WHERE id = $1 AND tenant_id = $2;

-- name: ListComparablePhotos :many
SELECT * FROM comparable_photos
WHERE comparable_id = $1 AND tenant_id = $2
ORDER BY created_at DESC;

-- name: AddComparablePhoto :one
INSERT INTO comparable_photos (tenant_id, comparable_id, photo_url, caption, created_by_name)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: DeleteComparablePhoto :exec
DELETE FROM comparable_photos WHERE id = $1 AND tenant_id = $2;

-- name: ComparablePhotoCounts :many
SELECT comparable_id, count(*) AS n
FROM comparable_photos
WHERE tenant_id = $1
GROUP BY comparable_id;
