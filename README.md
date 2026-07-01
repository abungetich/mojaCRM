# MojaCRM

Multi-tenant CRM platform: a tenant workspace dashboard plus a platform admin
console, built on a single Go API designed to also serve future mobile apps.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui + TanStack Query + React Hook Form + Zod + React Router + lucide-react icons
- **Backend**: Go + chi + PostgreSQL + sqlc + Redis
- **Auth**: JWT in an httpOnly secure cookie + RBAC (permission-keyed roles, per tenant)
- **Jobs**: Asynq (Redis-backed background queue)
- **DevOps**: Docker Compose for Postgres/Redis/API/worker, GitHub Actions CI
- **Monitoring**: Prometheus metrics at `/metrics`, optional Sentry via `SENTRY_DSN`
- **Docs**: OpenAPI spec at [`docs/openapi.yaml`](docs/openapi.yaml)

## Layout

The dashboard shell (sidebar + header + main content) and the users/RBAC
modules were adapted from the `waterboy` (PropSense360) project's
`AppShell`, `TenantLayout`/`AdminLayout`, and permission-middleware patterns.

## Running locally

1. Start Postgres + Redis (+ API + worker) in Docker:

   ```bash
   docker compose up -d postgres redis api worker
   ```

   The API container runs pending migrations automatically on boot.

2. Seed a demo tenant + platform admin:

   ```bash
   docker compose run --rm seed
   ```

   This creates:
   - Tenant **Acme Inc** (`acme`) with owner `owner@acme.test` / `password123`
   - Platform admin `admin@mojacrm.test` / `password123`

3. Run the frontend dev server (proxies `/api` to `localhost:8080`):

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open http://localhost:5173 (tenant login) or http://localhost:5173/admin/login (platform admin).

### Running the backend outside Docker

```bash
cd backend
cp .env.example .env   # adjust as needed
make run      # API on :8080
make worker   # Asynq worker (separate terminal)
make seed     # demo data
```

## Project structure

```
frontend/   React + Vite + TS dashboard (tenant + platform admin)
backend/    Go API (chi, sqlc, Postgres, Redis, Asynq)
docs/       OpenAPI spec
```
