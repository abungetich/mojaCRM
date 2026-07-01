# Deploying MojaCRM

One VPS — the existing Contabo box at `217.76.50.2` that already runs
PropSense360, voucherman, capstone, and the shared `amac-caddy` reverse
proxy. MojaCRM joins it as a fifth app: its own `postgres`, `redis`, `api`,
and `worker` containers (own volumes, not shared with the other apps'
Postgres instances), reverse-proxied by the same Caddy.

---

## 1. DNS — create these A records

Same split as PropSense: the **app** lives on its own subdomain, the apex +
`www` are reserved for a marketing site (redirected to the app for now,
since no marketing site is built yet — see the Caddy block in step 3). All
three point at the app VPS:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | `app` (app.mojacrm.com) | `217.76.50.2` | 300 (or Auto) |
| A | `@` (mojacrm.com) | `217.76.50.2` | 300 (or Auto) |
| A | `www` | `217.76.50.2` | 300 (or Auto) |

Give DNS a few minutes to propagate before starting Caddy on the new
domain, so Let's Encrypt's HTTP-01 challenge (which Caddy handles
automatically) can resolve each hostname to this server.

## 2. Deploy the app

```bash
ssh amac-server   # your existing alias for 217.76.50.2

mkdir -p /opt/mojacrm
cd /opt/mojacrm
git clone https://github.com/abungetich/mojaCRM.git .   # or `git pull` on redeploy

mkdir -p /etc/mojacrm /srv/mojacrm/postgres
# Copy deploy/.env.production.example to /etc/mojacrm/.env.production, then edit:
#   - POSTGRES_PASSWORD / DATABASE_URL password: generate with `openssl rand -hex 20`
#   - JWT_SECRET: generate with `openssl rand -hex 32`
#   - PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD: the real login you want
chmod 600 /etc/mojacrm/.env.production

cd /opt/mojacrm
docker compose -f deploy/docker-compose.contabo.yml up -d --build
docker compose -f deploy/docker-compose.contabo.yml ps   # confirm all healthy

# One-time: seed the platform admin (SEED_DEMO_TENANT=false in the env file
# skips the fake Acme demo tenant — only the platform admin gets created)
docker compose -f deploy/docker-compose.contabo.yml --profile seed run --rm seed

curl -s http://127.0.0.1:3102/healthz   # should print "ok"
```

## 3. Wire up Caddy

```bash
# Still on the app VPS. First generate the Basic Auth hash for /api/docs
# (Swagger UI) — pick your own password, paste the hash into the snippet
# before copying it in:
docker exec amac-caddy caddy hash-password --plaintext '<a real password>'

cat deploy/Caddyfile.snippet   # copy both blocks (app.mojacrm.com + apex/www)

nano /opt/amacplc/Caddyfile    # append both blocks from the snippet
                                # (append/in-place edit — do NOT `sed -i`,
                                # the Caddyfile is bind-mounted)

docker exec amac-caddy caddy validate --config /etc/caddy/Caddyfile  # sanity check first
docker exec amac-caddy caddy reload --config /etc/caddy/Caddyfile
```

Caddy will automatically obtain and renew Let's Encrypt certificates for
`app.mojacrm.com`, `mojacrm.com`, and `www.mojacrm.com` on first request, as
long as DNS (step 1) has propagated and ports 80/443 are open on the app
VPS (they already are, since the other apps are live on the same box/Caddy).

## 4. Verify

```bash
curl -sI https://app.mojacrm.com                       # 200, valid TLS
curl -s https://app.mojacrm.com/api/v1/branding        # public branding endpoint
curl -sI https://mojacrm.com                           # 301 -> https://app.mojacrm.com (until a marketing site exists)
curl -sI https://app.mojacrm.com/api/docs               # 401 (no credentials) — confirms docs are gated
curl -sI -u admin:<password> https://app.mojacrm.com/api/docs   # 200 — Swagger UI
```

Open `https://app.mojacrm.com` in a browser — you should see the MojaCRM
login/signup page served over HTTPS. `https://mojacrm.com` should redirect
there too until a real marketing site replaces that Caddy block.

## 5. Backups

Postgres data lives at `/srv/mojacrm/postgres` on the app VPS. Nightly
logical dump, kept 14 days (matches the pattern used for the other apps on
this box):

```bash
mkdir -p /srv/mojacrm/backups
cat > /etc/cron.daily/mojacrm-db-backup <<'EOF'
#!/bin/sh
docker exec mojacrm-postgres \
  pg_dump -U mojacrm mojacrm | gzip > /srv/mojacrm/backups/mojacrm-$(date +%F).sql.gz
find /srv/mojacrm/backups -name '*.sql.gz' -mtime +14 -delete
EOF
chmod +x /etc/cron.daily/mojacrm-db-backup
```

## 6. Redeploying after code changes

```bash
cd /opt/mojacrm
git pull                                              # or your push-to-deploy hook
docker compose -f deploy/docker-compose.contabo.yml up -d --build
```

Migrations run automatically on API startup (see
`internal/database/migrate.go`) — no separate migrate step needed.
