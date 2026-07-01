DELETE FROM permissions WHERE key IN ('comparables:read', 'comparables:write');
DROP TABLE IF EXISTS comparable_photos;
DROP TABLE IF EXISTS comparables;
