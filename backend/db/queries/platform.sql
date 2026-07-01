-- name: CreatePlatformAdmin :one
INSERT INTO platform_admins (email, name, password_hash)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetPlatformAdminByEmail :one
SELECT * FROM platform_admins WHERE email = $1;

-- name: GetPlatformAdminByID :one
SELECT * FROM platform_admins WHERE id = $1;

-- name: ListPlatformAdmins :many
SELECT * FROM platform_admins ORDER BY created_at ASC;
