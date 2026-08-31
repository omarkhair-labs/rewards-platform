# Rewards Platform

Production-oriented foundation for a GPT / rewards platform with CovenCash-style workflows.

## Current foundation

- TypeScript + Express API
- PostgreSQL canonical schema
- Argon2id password hashing
- JWT authentication
- Immutable wallet ledger with available + held balances
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

## Security rules

- No provider callback credits rewards without signature verification.
- Every wallet mutation is idempotent and recorded in `wallet_entries`.
- Cashout reserves balance before operator processing.
- Task rewards are credited only after moderation approval.
- Admin actions are audit logged.

## Next build lanes

1. Automated payout adapters where provider credentials exist.
2. Fraud hardening and security rules.
3. E2E tests and database integration tests.
4. Demo/seed environment and admin bootstrap.
5. Production deployment.
6. CovenCash parity QA screen-by-screen.


## Proof file storage

File proof tasks use an S3-compatible object store (Cloudflare R2, S3, MinIO, etc.). Configure the STORAGE_* variables from `apps/api/.env.example`. Files are uploaded directly from the browser using a five-minute signed PUT URL and task submissions only accept file URLs under that user's proof storage prefix.


## Payout catalog

Cashout methods are no longer hardcoded in the web UI. Enabled methods are stored in `payout_method_catalog`, including account field requirements, minimum points, fee basis points, operator/API mode and ordering. Each withdrawal snapshots its fee and net points so later catalog changes cannot rewrite historical payout economics.
