# Architecture

## Core invariants

1. `wallet_entries` is the immutable audit trail for balance movement.
2. `wallet_accounts` is a cached projection used for fast reads.
3. Every wallet mutation has a unique idempotency key.
4. Provider reward callbacks require signature verification.
5. Reward events own referral commissions so reversals can reverse both.
6. Withdrawals move points from available to held before processing.
7. A paid withdrawal consumes held points; a rejected/failed withdrawal releases them.
8. User-submitted task proof never directly credits a reward.
9. Administrative state changes are written to `audit_logs`.

## Main domains

- Identity: users, roles, account status.
- Wallet: accounts, ledger entries, holds.
- Rewards: offers, providers, reward events, postbacks.
- Tasks: tasks, proof submissions, moderation.
- Surveys: demographic profile + provider integrations.
- Referrals: referred users + commissions.
- Watch & Earn: timed server-tracked sessions.
- Cashout: methods, requests, processing.
- Operations: notifications, fraud events, audit logs.

## Planned deployment

- Web: Next.js
- API: Node.js / TypeScript / Express
- Database: PostgreSQL
- Queue/cache: Redis when async payout/provider jobs are introduced
- Object storage: S3-compatible storage for task proof files
