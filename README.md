# Rewards Platform

Production-oriented foundation for a GPT / rewards platform with CovenCash-style workflows.

## Current foundation

- TypeScript + Express API
- PostgreSQL canonical schema
- Argon2id password hashing
- JWT authentication
- Immutable wallet ledger with available + held + reversal-debt balances
- Idempotent wallet credit / debit / hold / release
- Offers + provider abstraction
- Signed provider postback foundation
- Reward-event idempotency
- Reward reversals
- Referral commissions coupled to reward events
- Task proof submission + admin moderation
- Saved withdrawal methods
- Withdrawal hold / settle / release lifecycle
- Survey demographic profile
- Watch & Earn sessions + member/admin campaign UI
- Notifications
- Admin users / offers / tasks / proofs / withdrawals / providers / watch campaigns / fraud / audit
- S3-compatible proof file uploads
- Database-backed payout method catalog with minimums, fees and account-field schemas
- Automatic level/rank progression
- Time-bounded or lifetime premium grants

## Product target

The customer-facing UX will be implemented to match the supplied CovenCash reference flow:

Dashboard → Offers → Surveys → Tasks → Affiliates → Cashout → Profile

The implementation uses original code and branding while matching the requested product behavior and information architecture.

## Run locally

1. Create a PostgreSQL database.
2. Apply `apps/api/migrations/001_core.sql`.
3. Copy `apps/api/.env.example` to `apps/api/.env`.
4. Set a strong `JWT_SECRET`.
5. Run `npm install`.
6. Run `npm run dev`.

## Standalone frontend preview

The complete member experience can be reviewed without the API by starting the web app with `NEXT_PUBLIC_DEMO_MODE=true`. Demo mode follows the same frontend contracts and simulates member data and mutations; set it to `false` and configure `NEXT_PUBLIC_API_URL` when handing the interface to another API team. See `docs/FRONTEND_API_HANDOFF.md` for the route contract map.

## Security rules

- JWTs pin HS256, issuer and audience and every authenticated request re-checks the database account role/status.
- Login and registration have dedicated throttles; targeted failed logins create fraud events.
- Official and generic provider callbacks are rate-limited and cannot credit without signature verification.
- Generic callback signatures bind transaction, user, reward amount **and status**, preventing a signed credit from being replayed as a reversal.
- Every wallet mutation is idempotent and recorded in `wallet_entries`.
- Chargebacks can create explicit wallet debt instead of failing when a reward was already spent; cashout is locked until that debt is settled by later credits or released held funds.
- Cashout reserves balance before operator processing and uses a strict pending → review → processing → paid lifecycle.
- Paid withdrawals require an operator payment reference; reject/fail transitions require a reason.
- Moderators can work review queues, but financial/configuration mutations are admin-only.
- Task rewards are credited only after moderation approval and active duplicate submissions are database-constrained.
- Configurable outbound URLs are restricted to HTTP(S).
- Admin actions are audit logged with BigInt-safe serialization and provider secrets redacted from audit metadata.

## Next build lanes

1. Demo/seed environment and admin bootstrap.
2. Production deployment configuration.
3. Automated payout adapters where provider credentials exist.
4. CovenCash parity QA screen-by-screen.
5. Production smoke/E2E pass against the deployed environment.


## Proof file storage

File proof tasks use an S3-compatible object store (Cloudflare R2, S3, MinIO, etc.). Configure the STORAGE_* variables from `apps/api/.env.example`. Files are uploaded directly from the browser using a five-minute signed PUT URL and task submissions only accept file URLs under that user's proof storage prefix.


## Payout catalog

Cashout methods are no longer hardcoded in the web UI. Enabled methods are stored in `payout_method_catalog`, including account field requirements, minimum points, fee basis points, operator/API mode and ordering. Each withdrawal snapshots its fee and net points so later catalog changes cannot rewrite historical payout economics.


## Integration tests

`npm test` runs the API security/integrity suite against PostgreSQL. The suite rebuilds an isolated test schema and covers JWT claims/RBAC, task proof credit idempotency, repeatable tasks, withdrawal state transitions and balance holds, signed provider credit/reversal behavior, reversal debt, oversized rewards, concurrent Watch & Earn completion, unsafe outbound URLs and fraud-event logging.

The CI workflow provisions PostgreSQL 16, audits production dependencies, builds API + web, then runs the integration suite.
