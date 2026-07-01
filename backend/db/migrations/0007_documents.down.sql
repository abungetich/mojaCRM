DELETE FROM permissions WHERE key IN (
    'documents:read', 'documents:write', 'documents:delete'
);
DROP TABLE IF EXISTS document_versions;
DROP TABLE IF EXISTS company_documents;
