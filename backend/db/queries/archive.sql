-- name: ListArchived :many
SELECT 'client' AS entity, id, display_name AS label, deleted_at, deleted_by_name, delete_reason
FROM clients WHERE tenant_id = $1::uuid AND deleted_at IS NOT NULL
UNION ALL
SELECT 'partner', id, name, deleted_at, deleted_by_name, delete_reason
FROM partners WHERE tenant_id = $1::uuid AND deleted_at IS NOT NULL
UNION ALL
SELECT 'branch', id, name, deleted_at, deleted_by_name, delete_reason
FROM partner_branches WHERE tenant_id = $1::uuid AND deleted_at IS NOT NULL
UNION ALL
SELECT 'partner_contact', id, trim(first_name || ' ' || last_name), deleted_at, deleted_by_name, delete_reason
FROM partner_contacts WHERE tenant_id = $1::uuid AND deleted_at IS NOT NULL
UNION ALL
SELECT 'office', id, name, deleted_at, deleted_by_name, delete_reason
FROM offices WHERE tenant_id = $1::uuid AND deleted_at IS NOT NULL
UNION ALL
SELECT 'department', id, name, deleted_at, deleted_by_name, delete_reason
FROM departments WHERE tenant_id = $1::uuid AND deleted_at IS NOT NULL
UNION ALL
SELECT 'tender', id, title, deleted_at, deleted_by_name, delete_reason
FROM tenders WHERE tenant_id = $1::uuid AND deleted_at IS NOT NULL
ORDER BY deleted_at DESC;
