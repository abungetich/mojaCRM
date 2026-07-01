DELETE FROM permissions WHERE key IN (
    'clients:read', 'clients:write', 'clients:delete',
    'partners:read', 'partners:write', 'partners:delete'
);
DROP TABLE IF EXISTS partner_appendix_templates;
DROP TABLE IF EXISTS partner_requirements;
DROP TABLE IF EXISTS partner_contacts;
DROP TABLE IF EXISTS partner_branches;
DROP TABLE IF EXISTS partners;
DROP TABLE IF EXISTS clients;
