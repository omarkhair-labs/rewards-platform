# Production readiness

This repository supports a containerized production deployment with PostgreSQL, a standalone Next.js web image, an Express API image, tracked SQL migrations, explicit admin bootstrap and an opt-in demo seed.

## 1. Required production secrets

Set these outside Git:

- `POSTGRES_PASSWORD`
- `JWT_SECRET` with at least 32 random characters
- `APP_ORIGIN` — public web origin, for example `https://rewards.example.com`
- `PUBLIC_API_URL` — public API origin, for example `https://api.rewards.example.com`

For the first admin bootstrap also set:

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD` — at least 12 characters

For proof uploads configure the S3-compatible `STORAGE_*` variables.

Provider API keys, callback secrets and payout credentials must be supplied by the client and must never be committed.

## 2. Database migrations

Run all migrations with:

```bash
npm run db:migrate
```

The runner:

- takes a PostgreSQL advisory lock
- applies files in filename order
- records SHA-256 checksums in `schema_migrations`
- refuses to continue if an already-applied migration file has changed
- is safe to run repeatedly

The production API container runs migrations before starting the server.

## 3. First admin

After migrations, bootstrap the first administrator:

```bash
npm run admin:bootstrap
```

The command creates the configured account when absent. If the exact account already exists, it ensures the role is `admin` and the account is active. It does not print or store the plaintext password.

## 4. Demo environment

Demo data is intentionally opt-in. Set:

```text
DEMO_SEED_ENABLED=true
DEMO_USER_PASSWORD=<strong temporary demo password>
```

Then run:

```bash
npm run db:seed
```

The seed is idempotent and creates a preview member, a referred member, offers, tasks, a task review state, Watch & Earn campaigns, reward history, referral earnings and an in-review cashout with held balance.

The preview login email is `demo@example.test`. The password is only the value supplied through `DEMO_USER_PASSWORD`.

Do not enable demo seeding on a live customer database unless a demo account is explicitly required.

## 5. Container deployment

Copy `docker-compose.production.example.yml` to your deployment system or translate the same services into Coolify, Render, Railway, Fly.io, ECS, Kubernetes or another container platform.

Expected services:

- PostgreSQL 16
- API built from `Dockerfile.api`
- Web built from `Dockerfile.web`
- S3-compatible object storage for file proofs

The web image bakes `NEXT_PUBLIC_API_URL` at build time.

## 6. Health checks

- `GET /health` — process liveness
- `GET /ready` — API plus PostgreSQL readiness

Use `/ready` for deployment health checks.

## 7. Provider activation

Provider presets remain disabled until real client credentials exist. Activate and verify each provider separately, using the deployed callback URLs. Never simulate a real provider credit in production.

## 8. Final smoke path

Before handoff, verify:

`Register → Login → Offer/Survey/Task/Watch earning → Wallet → Referral → Cashout → Admin review → Processing → Paid`

Also verify:

`duplicate callback → no duplicate credit`

`reward reversal after spend → debt → future earning settles debt → cashout unlocks`

No production handoff is complete until these paths have been exercised against the deployed environment.
