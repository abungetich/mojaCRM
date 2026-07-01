-- name: CreateUser :one
INSERT INTO users (tenant_id, role_id, email, name, password_hash, status)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE tenant_id = $1 AND email = $2;

-- name: GetUserByEmailAnyTenant :one
SELECT * FROM users WHERE email = $1 LIMIT 1;

-- name: GetUserWithRoleByID :one
SELECT u.*, r.name AS role_name
FROM users u
LEFT JOIN roles r ON r.id = u.role_id
WHERE u.id = $1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: ListUsersWithRole :many
SELECT u.*, r.name AS role_name
FROM users u
LEFT JOIN roles r ON r.id = u.role_id
WHERE u.tenant_id = $1
ORDER BY u.created_at ASC;

-- name: UpdateUserRole :one
UPDATE users SET role_id = $2, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateUserStatus :one
UPDATE users SET status = $2, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1 AND tenant_id = $2;

-- name: SetVerificationToken :exec
UPDATE users SET verification_token = $2, verification_expires_at = $3
WHERE id = $1;

-- name: GetUserByVerificationToken :one
SELECT * FROM users WHERE verification_token = $1;

-- name: MarkUserVerified :one
UPDATE users
SET status = 'active', email_verified_at = now(), verification_token = NULL, verification_expires_at = NULL, updated_at = now()
WHERE id = $1
RETURNING *;
