# Complete frontend API handoff

The member and operations portals can run in two modes without changing page components:

- `NEXT_PUBLIC_DEMO_MODE=true`: a standalone interactive presentation using realistic in-browser data.
- `NEXT_PUBLIC_DEMO_MODE=false`: requests are sent to `NEXT_PUBLIC_API_URL`.

Demo mode is the safe default for unconfigured review deployments:

- Member: `demo@rewards.local` / `Demo2026!`
- Admin: `admin@rewards.local` / `Admin2026!`

The login screen can fill either account. Member and admin mutations are simulated in memory for the current browser session; a full deployment reload restores the canonical presentation data. Set the flag explicitly to `false` when the client API is available.

The wallet summary and support drawer are complete UI interactions. The support drawer keeps messages in the current page session so the client can connect its preferred chat/support API without changing the shell.

Every page calls the shared `apiFetch()` adapter in `apps/web/lib/api.ts`. The company API can preserve the existing paths and JSON shapes, or replace that adapter with its own client while leaving the UI intact. Demo behavior is intentionally isolated in `demo-api.ts` and `demo-admin-api.ts`; page components do not import fixtures directly.

## Member contracts

- Authentication: `/api/auth/login`, `/api/auth/register`, `/api/auth/me`
- Dashboard and profile: `/api/account/dashboard`, `/api/account/profile`, `/api/account/transactions`, `/api/account/level-progress`
- Notifications: `/api/account/notifications`, `/api/account/notifications/:id/read`
- Offers: `/api/providers/offers`, `/api/providers/offers/:id/click`
- Surveys: `/api/surveys/profile`, `/api/surveys/providers`, `/api/integrations/cpx/*`, `/api/integrations/theoremreach/entry`
- Tasks: `/api/tasks`, `/api/tasks/submissions/me`, `/api/tasks/:id/submit`, `/api/uploads/proof`
- Affiliates: `/api/referrals`
- Cashout: `/api/withdrawals/catalog`, `/api/withdrawals/methods`, `/api/withdrawals`
- Watch and Earn: `/api/watch`, `/api/watch/:id/start`, `/api/watch/sessions/:sessionId/complete`

The canonical TypeScript response shapes are in `apps/web/lib/types.ts`; the complete interactive reference payloads and mutation behavior are in `apps/web/lib/demo-api.ts`.

## Admin contracts

- Overview: `/api/admin/dashboard`
- Users and access: `/api/admin/users`, `/api/admin/users/:id`
- Offers: `/api/admin/offers`, `/api/admin/offers/:id`
- Tasks and moderation: `/api/admin/tasks`, `/api/admin/tasks/:id`, `/api/admin/task-submissions`, `/api/admin/task-submissions/:id`
- Withdrawals: `/api/admin/withdrawals`, `/api/admin/withdrawals/:id`
- Payout catalog: `/api/admin/payout-methods`, `/api/admin/payout-methods/:id`
- Providers: `/api/admin/providers`, `/api/admin/providers/:id`
- Watch campaigns: `/api/admin/watch-campaigns`, `/api/admin/watch-campaigns/:id`
- Product rules: `/api/admin/level-rules`
- Risk and operations: `/api/admin/fraud-events`, `/api/admin/audit-logs`

Admin response shapes are in `apps/web/lib/admin-types.ts`; the interactive handoff behavior is in `apps/web/lib/demo-admin-api.ts`.

## Client integration sequence

1. Set `NEXT_PUBLIC_DEMO_MODE=false` and configure `NEXT_PUBLIC_API_URL` at build time.
2. Implement the contracts above or translate the company payloads inside `apiFetch()`.
3. Return the real authentication token and role from login; the existing shells enforce member/admin routing.
4. Preserve the documented status values for task submissions, withdrawals, users and providers, or map them in the adapter.
5. Replace only the demo modules after live API acceptance; the page and component tree should remain unchanged.
