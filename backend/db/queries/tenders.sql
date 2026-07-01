-- Tenders & Pre-Qualification, ported from propsense (waterboy backend).
-- propsense scopes rows via Postgres RLS + current_tenant_id(); MojaCRM has
-- no RLS, so every query takes an explicit tenant_id (see clients.sql).

-- name: ListTenders :many
SELECT t.id, t.title, t.reference, t.issuer, t.type, t.category, t.stage,
       t.submission_deadline, t.opening_datetime, t.estimated_value, t.doc_fee, t.currency,
       t.security_type, t.security_amount, t.signed, t.submitted_on, t.outcome_note,
       t.owner_user_id, COALESCE(u.name, '') AS owner_name,
       (SELECT count(*) FROM tender_documents d WHERE d.tender_id = t.id) AS doc_count,
       t.created_at, t.created_by_name
FROM tenders t
LEFT JOIN users u ON u.id = t.owner_user_id
WHERE t.tenant_id = $1 AND t.deleted_at IS NULL
  AND ($2::text = '' OR t.stage = $2)
  AND (
    $3::text = '' OR
    t.title ILIKE '%' || $3 || '%' OR
    t.issuer ILIKE '%' || $3 || '%' OR
    t.reference ILIKE '%' || $3 || '%'
  )
ORDER BY (t.submission_deadline = '') ASC, t.submission_deadline ASC, t.created_at DESC
LIMIT $4 OFFSET $5;

-- name: CountTenders :one
SELECT count(*)
FROM tenders t
WHERE t.tenant_id = $1 AND t.deleted_at IS NULL
  AND ($2::text = '' OR t.stage = $2)
  AND (
    $3::text = '' OR
    t.title ILIKE '%' || $3 || '%' OR
    t.issuer ILIKE '%' || $3 || '%' OR
    t.reference ILIKE '%' || $3 || '%'
  );

-- name: GetTender :one
SELECT t.*, COALESCE(u.name, '') AS owner_name
FROM tenders t
LEFT JOIN users u ON u.id = t.owner_user_id
WHERE t.id = $1 AND t.tenant_id = $2 AND t.deleted_at IS NULL;

-- name: CreateTender :one
INSERT INTO tenders (
    tenant_id, title, reference, issuer, type, category, description, stage, outcome_note,
    submission_deadline, opening_datetime, submission_method, submission_address, submission_email, submission_contact,
    estimated_value, doc_fee, currency, security_type, security_amount, security_validity,
    owner_user_id, signed, requirements, contact_name, contact_email, notes, created_by_name
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9,
    $10, $11, $12, $13, $14, $15,
    $16, $17, $18, $19, $20, $21,
    $22, $23, $24, $25, $26, $27, $28
)
RETURNING *;

-- name: UpdateTender :one
UPDATE tenders SET
    title = $3, reference = $4, issuer = $5, type = $6, category = $7, description = $8,
    stage = $9, outcome_note = $10, submission_deadline = $11, opening_datetime = $12,
    submission_method = $13, submission_address = $14, submission_email = $15, submission_contact = $16,
    estimated_value = $17, doc_fee = $18, currency = $19, security_type = $20, security_amount = $21, security_validity = $22,
    owner_user_id = $23, signed = $24, requirements = $25, contact_name = $26, contact_email = $27, notes = $28,
    updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: SetTenderStage :exec
UPDATE tenders SET stage = $3, stage_log = $4, outcome_note = $5, updated_at = now()
WHERE id = $1 AND tenant_id = $2;

-- name: SetTenderSubmission :exec
UPDATE tenders SET stage = 'submitted', submitted_on = $3, submission_method = $4, submission_log = $5, updated_at = now()
WHERE id = $1 AND tenant_id = $2;

-- name: AssignTender :exec
UPDATE tenders SET owner_user_id = $3, updated_at = now()
WHERE id = $1 AND tenant_id = $2;

-- name: DeleteTender :exec
UPDATE tenders SET deleted_at = now(), deleted_by_name = $3, delete_reason = $4
WHERE id = $1 AND tenant_id = $2;

-- ---- Documents ----

-- name: ListTenderDocuments :many
SELECT id, name, label, kind, created_at, created_by_name
FROM tender_documents WHERE tender_id = $1 AND tenant_id = $2 ORDER BY created_at;

-- name: GetTenderDocument :one
SELECT id, data_url, name FROM tender_documents WHERE id = $1 AND tenant_id = $2;

-- name: AddTenderDocument :one
INSERT INTO tender_documents (tenant_id, tender_id, name, label, kind, data_url, created_by_name)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id;

-- name: DeleteTenderDocument :exec
DELETE FROM tender_documents WHERE id = $1 AND tenant_id = $2;

-- ---- Letter templates ----

-- name: ListTenderLetters :many
SELECT id, name, kind, template_content, is_default, created_at, created_by_name
FROM tender_letters WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY name;

-- name: CreateTenderLetter :one
INSERT INTO tender_letters (tenant_id, name, kind, template_content, is_default, created_by_name)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;

-- name: UpdateTenderLetter :exec
UPDATE tender_letters SET name = $3, kind = $4, template_content = $5, is_default = $6
WHERE id = $1 AND tenant_id = $2;

-- name: DeleteTenderLetter :exec
UPDATE tender_letters SET deleted_at = now() WHERE id = $1 AND tenant_id = $2;

-- name: RestoreTender :exec
UPDATE tenders SET deleted_at = NULL, deleted_by_name = '', delete_reason = ''
WHERE id = $1 AND tenant_id = $2;

-- name: PurgeTender :exec
DELETE FROM tenders WHERE id = $1 AND tenant_id = $2;
