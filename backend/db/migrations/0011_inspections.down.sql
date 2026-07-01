DELETE FROM permissions WHERE key IN ('inspections:read', 'inspections:write');
DROP TABLE IF EXISTS inspection_photos;
DROP TABLE IF EXISTS inspections;
