ALTER TABLE users
    ADD COLUMN email_verified_at TIMESTAMPTZ,
    ADD COLUMN verification_token TEXT UNIQUE,
    ADD COLUMN verification_expires_at TIMESTAMPTZ;
