DELETE FROM permissions WHERE key IN ('customers:read', 'customers:write', 'customers:delete');
DROP TABLE IF EXISTS customer_notes;
DROP TABLE IF EXISTS customer_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS customers;
