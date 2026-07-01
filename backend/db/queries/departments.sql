-- name: ListDepartments :many
SELECT d.*, u.name AS head_user_name,
    (SELECT COUNT(*) FROM department_members dm WHERE dm.department_id = d.id) AS member_count
FROM departments d
LEFT JOIN users u ON u.id = d.head_user_id
WHERE d.tenant_id = $1 AND d.deleted_at IS NULL
ORDER BY d.name;

-- name: GetDepartment :one
SELECT d.*, u.name AS head_user_name,
    (SELECT COUNT(*) FROM department_members dm WHERE dm.department_id = d.id) AS member_count
FROM departments d
LEFT JOIN users u ON u.id = d.head_user_id
WHERE d.id = $1 AND d.tenant_id = $2;

-- name: CreateDepartment :one
INSERT INTO departments (tenant_id, name, description, head_user_id, created_by_name)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdateDepartment :one
UPDATE departments SET name = $3, description = $4, head_user_id = $5, updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteDepartment :exec
UPDATE departments SET deleted_at = now(), deleted_by_name = $3, delete_reason = $4
WHERE id = $1 AND tenant_id = $2;

-- name: RestoreDepartment :exec
UPDATE departments SET deleted_at = NULL, deleted_by_name = '', delete_reason = ''
WHERE id = $1 AND tenant_id = $2;

-- name: PurgeDepartment :exec
DELETE FROM departments WHERE id = $1 AND tenant_id = $2;

-- name: ListDepartmentMembers :many
SELECT u.id, u.name, u.email, dm.created_at
FROM department_members dm
JOIN users u ON u.id = dm.user_id
WHERE dm.department_id = $1
ORDER BY u.name;

-- name: AddDepartmentMember :exec
INSERT INTO department_members (tenant_id, department_id, user_id)
VALUES ($1, $2, $3)
ON CONFLICT (department_id, user_id) DO NOTHING;

-- name: RemoveDepartmentMember :exec
DELETE FROM department_members WHERE department_id = $1 AND user_id = $2;
