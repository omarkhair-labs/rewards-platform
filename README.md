# Rewards Platform

Production-oriented GPT / rewards platform with CovenCash-style member workflows, original code and client-owned branding.

## Current product

- Dashboard → Offers → Surveys → Tasks → Affiliates → Cashout → Profile
- Operations admin console
- PostgreSQL wallet ledger with available, held and reversal-debt balances
- Signed and idempotent reward callbacks
- Referral commissions and reversals
- Task proof moderation
- Watch & Earn
- Dynamic payout catalog and withdrawal state machine
- Levels, ranks and premium
- S3-compatible proof uploads
- Security/integrity integration suite
- Blacksmith CI
- Container production configuration
- Tracked SQL migration runner
- Explicit first-admin bootstrap
- Opt-in idempotent demo seed

## Local setup

1. Create PostgreSQL and copy `apps/api/.env.example` to `apps/api/.env`.
2. Set `DATABASE_URL`, `JWT_SECRET`, `APP_ORIGIN` and `PUBLIC_API_URL`.
3. Install dependencies:

```bash
npm install
```

4. Apply all migrations:

```bash
npm run db:migrate
```

5. Start the API and web in separate terminals:

```bash
npm run dev:api
npm run dev:web
```

## Standalone frontend preview

The complete member experience can be reviewed without the API by starting the web app with `NEXT_PUBLIC_DEMO_MODE=true`. Demo mode follows the same frontend contracts and simulates member data and mutations; set it to `false` and configure `NEXT_PUBLIC_API_URL` when handing the interface to another API team. See `docs/FRONTEND_API_HANDOFF.md` for the route contract map.

## Demo and first admin

First admin:

```bash
npm run admin:bootstrap
```

Demo data is opt-in and requires `DEMO_SEED_ENABLED=true` plus a strong `DEMO_USER_PASSWORD`:

```bash
npm run db:seed
```

See `docs/PRODUCTION.md` for production variables, containers, health checks, provider activation and final smoke paths.

## Security invariants

- JWT HS256 with issuer/audience validation and live account role/status checks.
- Dedicated authentication throttles and fraud signals.
- Signed provider callbacks bind transaction, user, reward and status.
- Wallet mutations are idempotent and ledgered.
- Reversals can create explicit debt when points were already spent.
- Cashout is locked while reward debt exists.
- Withdrawals reserve balance before processing and require valid state transitions.
- Paid withdrawals require a payment reference.
- Moderators review queues; financial/configuration mutations are admin-only.
- Active duplicate task submissions are database constrained.
- Configurable outbound URLs require HTTP(S).
- Provider secrets are redacted from audit metadata.

## Verification

`npm test` runs PostgreSQL-backed security/integrity tests. CI additionally verifies migrations twice, admin bootstrap, demo seeding, API/web production builds and both Docker images.

## Remaining go-live work

The codebase is production-ready at the infrastructure/configuration level. Real go-live still requires client-owned provider credentials, payout credentials where automation is requested, production domains/object storage, and a final deployed E2E smoke pass.
