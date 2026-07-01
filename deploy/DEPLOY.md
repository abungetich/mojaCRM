# Deploying MojaCRM

Two VPSes:

- **App VPS** — the existing Contabo box at `217.76.50.2` that already runs
  PropSense360 and the shared `amac-caddy` reverse proxy. MojaCRM's API +
  worker + Redis join it as a second app, reverse-proxied by the same Caddy.
- **DB VPS** — a **new**, separate VPS that runs nothing but Postgres. Not
  provisioned yet — you'll need to spin one up (Contabo, for billing/region
  consistency with the app VPS, but any provider works).

Postgres is intentionally on its own box so a Postgres incident/upgrade/
resource spike can't take down the app server (and vice versa).

---

## 1. Provision the DB VPS

Pick a small VPS (2 vCPU / 4GB RAM is plenty to start) in the **same region**
as the app VPS to keep latency low. If your provider supports **private
networking** between VPS instances on the same account (Contabo does, via
their "Private Networking" add-on), enable it and use the private IP for
`DATABASE_URL` instead of the public IP — that keeps Postgres traffic off
the public internet entirely. If not available, the firewall rule in step 2
is what protects it instead.

Once it's up, note its public IP — you'll need it for:
- `DATABASE_URL` in `/etc/mojacrm/.env.production` (step 4)
- the `ufw` rule below (this DB VPS's firewall, allowing only the app VPS in)

## 2. Set up Postgres on the DB VPS

```bash
ssh root@<DB_VPS_IP>

# Docker (skip if already installed)
curl -fsSL https://get.docker.com | sh

# Data directory (host bind-mount so it survives container recreation)
mkdir -p /srv/mojacrm/postgres

# Secrets
mkdir -p /etc/mojacrm
cat > /etc/mojacrm/.env.db <<'EOF'
POSTGRES_USER=mojacrm
POSTGRES_PASSWORD=<GENERATE_A_STRONG_PASSWORD>
POSTGRES_DB=mojacrm
EOF
chmod 600 /etc/mojacrm/.env.db

# Firewall: only the app VPS may reach Postgres. Replace with the app VPS's
# actual public IP (217.76.50.2) — or its private IP if using private networking.
ufw allow from 217.76.50.2 to any port 5432 proto tcp
ufw enable   # if not already enabled; double-check your SSH rule is in first!
```

Copy `deploy/docker-compose.db.yml` to the DB VPS (e.g. `scp` it to
`/opt/mojacrm-db/docker-compose.yml`), then:

```bash
cd /opt/mojacrm-db
docker compose up -d
docker compose ps   # confirm postgres is healthy
```

**Nightly backups** (matches PropSense's pattern — logical dumps, kept 14
days):

```bash
mkdir -p /srv/mojacrm/backups
cat > /etc/cron.daily/mojacrm-db-backup <<'EOF'
#!/bin/sh
docker exec $(docker ps -qf name=postgres) \
  pg_dump -U mojacrm mojacrm | gzip > /srv/mojacrm/backups/mojacrm-$(date +%F).sql.gz
find /srv/mojacrm/backups -name '*.sql.gz' -mtime +14 -delete
EOF
chmod +x /etc/cron.daily/mojacrm-db-backup
```

## 3. DNS — create these A records now

Same split as PropSense: the **app** lives on its own subdomain, the apex +
`www` are reserved for a marketing site (redirected to the app for now,
since no marketing site is built yet — see the Caddy block in step 5). All
three point at the **app VPS** — Postgres never needs a public DNS entry,
the app reaches it by IP directly:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | `app` (app.mojacrm.com) | `217.76.50.2` | 300 (or Auto) |
| A | `@` (mojacrm.com) | `217.76.50.2` | 300 (or Auto) |
| A | `www` | `217.76.50.2` | 300 (or Auto) |

If your DNS provider only supports CNAME for `www`, use `CNAME www ->
mojacrm.com` instead of a second A record — both work with Caddy.

Give DNS a few minutes to propagate before starting Caddy on the new
domain, so Let's Encrypt's HTTP-01 challenge (which Caddy handles
automatically) can resolve each hostname to this server.

## 4. Deploy the app to the App VPS

```bash
ssh amac-server   # your existing alias for 217.76.50.2

mkdir -p /opt/mojacrm
# From your machine: push the repo up, e.g.
#   git clone --bare . ssh://amac-server/opt/mojacrm.git   (one-time)
#   git remote add contabo ssh://amac-server/opt/mojacrm.git
#   git push contabo main
# or simplest for a first deploy: scp/git clone the repo directly into /opt/mojacrm

mkdir -p /etc/mojacrm
# Copy deploy/.env.production.example to /etc/mojacrm/.env.production, then edit:
#   - DATABASE_URL: the DB VPS's IP + the password you set in step 2
#   - JWT_SECRET: generate with `openssl rand -hex 32`
chmod 600 /etc/mojacrm/.env.production

cd /opt/mojacrm
docker compose -f deploy/docker-compose.contabo.yml up -d --build
docker compose -f deploy/docker-compose.contabo.yml ps   # confirm healthy

# One-time: seed a demo tenant + platform admin (optional, safe to skip in prod —
# probably skip it in prod and create the first tenant/admin for real instead)
docker compose -f deploy/docker-compose.contabo.yml --profile seed run --rm seed

curl -s http://127.0.0.1:3102/healthz   # should print "ok"
```

## 5. Wire up Caddy

```bash
# Still on the app VPS:
cat deploy/Caddyfile.snippet   # copy both blocks (app.mojacrm.com + apex/www)

nano /opt/amacplc/Caddyfile    # append both blocks from the snippet
                                # (append/in-place edit — do NOT `sed -i`)

docker exec amac-caddy caddy reload --config /etc/caddy/Caddyfile
```

Caddy will automatically obtain and renew Let's Encrypt certificates for
`app.mojacrm.com`, `mojacrm.com`, and `www.mojacrm.com` on first request, as
long as DNS (step 3) has propagated and ports 80/443 are open on the app
VPS (they already are, since PropSense is live on the same box/Caddy).

## 6. Verify

```bash
curl -sI https://app.mojacrm.com                       # 200, valid TLS
curl -s https://app.mojacrm.com/api/v1/branding        # public branding endpoint
curl -sI https://mojacrm.com                           # 301 -> https://app.mojacrm.com (until a marketing site exists)
```

Open `https://app.mojacrm.com` in a browser — you should see the MojaCRM
login/signup page served over HTTPS. `https://mojacrm.com` should redirect
there too until a real marketing site replaces that Caddy block.

## 7. Redeploying after code changes

```bash
cd /opt/mojacrm
git pull                                              # or your push-to-deploy hook
docker compose -f deploy/docker-compose.contabo.yml up -d --build
```

Migrations run automatically on API startup (see
`internal/database/migrate.go`) — no separate migrate step needed.
