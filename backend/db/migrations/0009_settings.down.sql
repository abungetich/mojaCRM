DELETE FROM permissions WHERE key IN ('departments:read', 'departments:write', 'archive:read', 'archive:write');

DROP TABLE IF EXISTS reference_data;
DROP TABLE IF EXISTS department_members;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS offices;

ALTER TABLE tenants
    DROP COLUMN IF EXISTS mail_sender_name,
    DROP COLUMN IF EXISTS mail_reply_to,
    DROP COLUMN IF EXISTS invoice_cc,
    DROP COLUMN IF EXISTS invoice_bcc,
    DROP COLUMN IF EXISTS billing_email,
    DROP COLUMN IF EXISTS country,
    DROP COLUMN IF EXISTS legal_name,
    DROP COLUMN IF EXISTS registration_no,
    DROP COLUMN IF EXISTS kra_pin,
    DROP COLUMN IF EXISTS phone,
    DROP COLUMN IF EXISTS email,
    DROP COLUMN IF EXISTS website;
