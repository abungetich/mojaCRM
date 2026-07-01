DELETE FROM permissions WHERE key IN ('tenders:read', 'tenders:write');
DROP TABLE IF EXISTS tender_letters;
DROP TABLE IF EXISTS tender_documents;
DROP TABLE IF EXISTS tenders;
