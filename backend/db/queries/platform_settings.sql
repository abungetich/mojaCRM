-- name: GetPlatformSettings :one
SELECT * FROM platform_settings WHERE id = true;

-- name: UpdatePlatformSettings :one
UPDATE platform_settings SET
    app_name = $1,
    tagline = $2,
    logo_url = $3,
    icon_url = $4,
    updated_at = now()
WHERE id = true
RETURNING *;
