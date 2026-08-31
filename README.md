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
- Watch & Earn sessions
- Notifications
- Admin users / tasks / proofs / withdrawals / providers / fraud / audit

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

1. Exact provider adapters: Lootably, CPX, AdGem, BitLabs, TheoremReach.
2. Payout method catalog + manual/automated payout adapters.
3. Premium / level rules.
4. Full Next.js user application matching the reference.
5. Full admin interface.
6. E2E tests, deployment and parity QA.
