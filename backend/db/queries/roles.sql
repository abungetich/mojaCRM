-- name: CreateRole :one
INSERT INTO roles (tenant_id, name, description, is_system)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListRolesByTenant :many
SELECT * FROM roles WHERE tenant_id = $1 ORDER BY created_at ASC;

-- name: GetRoleByID :one
SELECT * FROM roles WHERE id = $1 AND tenant_id = $2;

-- name: ListPermissions :many
SELECT * FROM permissions ORDER BY key ASC;

-- name: ListRolePermissionKeys :many
SELECT permission_key FROM role_permissions WHERE role_id = $1;

-- name: ClearRolePermissions :exec
DELETE FROM role_permissions WHERE role_id = $1;

-- name: AddPermissionToRole :exec
INSERT INTO role_permissions (role_id, permission_key)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: GetUserPermissionKeys :many
SELECT rp.permission_key
FROM users u
JOIN role_permissions rp ON rp.role_id = u.role_id
WHERE u.id = $1;
