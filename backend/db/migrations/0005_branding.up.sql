-- Singleton table: platform-wide branding shown in the admin console and
-- on the platform login page.
CREATE TABLE platform_settings (
    id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
    app_name TEXT NOT NULL DEFAULT 'MojaCRM',
    tagline TEXT NOT NULL DEFAULT 'Platform console',
    logo_url TEXT NOT NULL DEFAULT '',
    icon_url TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (id) VALUES (true);
