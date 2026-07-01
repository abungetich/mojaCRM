-- Document Vault: company-wide/staff documents + their version history.
-- ported from propsense's company_documents.sql; tenant scoping is explicit
-- (every query takes tenant_id) since MojaCRM has no RLS.

-- name: ListDocuments :many
SELECT * FROM company_documents
WHERE tenant_id = $1
  AND ($2::text = '' OR category = $2)
  AND (
    $3::text = '' OR
    name ILIKE '%' || $3 || '%' OR
    doc_number ILIKE '%' || $3 || '%' OR
    issuer ILIKE '%' || $3 || '%' OR
    owner_name ILIKE '%' || $3 || '%'
  )
ORDER BY active DESC, expiry_date NULLS LAST, name
LIMIT $4 OFFSET $5;

-- name: CountDocuments :one
SELECT count(*) FROM company_documents
WHERE tenant_id = $1
  AND ($2::text = '' OR category = $2)
  AND (
    $3::text = '' OR
    name ILIKE '%' || $3 || '%' OR
    doc_number ILIKE '%' || $3 || '%' OR
    issuer ILIKE '%' || $3 || '%' OR
    owner_name ILIKE '%' || $3 || '%'
  );

-- name: GetDocument :one
SELECT * FROM company_documents WHERE id = $1 AND tenant_id = $2;

-- name: CreateDocument :one
INSERT INTO company_documents (
    tenant_id, name, category, doc_number, issuer, description, owner_user_id, owner_name,
    file_name, file_url, issue_date, expiry_date, renewal_lead_days, on_report, report_mode, created_by_name
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8,
    $9, $10, $11, $12, $13, $14, $15, $16
)
RETURNING *;

-- name: UpdateDocument :one
UPDATE company_documents SET
    name = $3,
    category = $4,
    doc_number = $5,
    issuer = $6,
    description = $7,
    owner_user_id = $8,
    owner_name = $9,
    issue_date = $10,
    expiry_date = $11,
    renewal_lead_days = $12,
    on_report = $13,
    report_mode = $14,
    active = $15,
    updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteDocument :exec
-- Hard delete, matching propsense (company_documents has no soft-delete columns).
DELETE FROM company_documents WHERE id = $1 AND tenant_id = $2;

-- name: ArchiveCurrentVersion :exec
-- Snapshot the document's current file + dates into the version history,
-- before SetNewVersion overwrites them.
INSERT INTO document_versions (tenant_id, document_id, version_no, file_name, file_url, issue_date, expiry_date, created_by_name)
SELECT d.tenant_id, d.id, d.version_no, d.file_name, d.file_url, d.issue_date, d.expiry_date, d.created_by_name
FROM company_documents d WHERE d.id = $1 AND d.tenant_id = $2;

-- name: SetNewVersion :one
-- Replace the current file + dates with a new version and bump the version number.
UPDATE company_documents SET
    file_name = $3,
    file_url = $4,
    issue_date = $5,
    expiry_date = $6,
    version_no = version_no + 1,
    created_by_name = $7,
    updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: ListDocumentVersions :many
SELECT * FROM document_versions WHERE document_id = $1 AND tenant_id = $2 ORDER BY version_no DESC;
