DELETE FROM permissions WHERE key IN ('communications:read', 'communications:write');
DROP TABLE IF EXISTS customer_communications;
