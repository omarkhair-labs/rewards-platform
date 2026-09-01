# Frontend API handoff

The member portal can run in two modes without changing page components:

- `NEXT_PUBLIC_DEMO_MODE=true`: a standalone interactive presentation using realistic in-browser data.
- `NEXT_PUBLIC_DEMO_MODE=false`: requests are sent to `NEXT_PUBLIC_API_URL`.

Demo mode is the safe default for unconfigured review deployments. The login page is prefilled with `demo@rewards.local` / `Demo2026!`; any valid email and password also work. Set the flag explicitly to `false` when the client API is available.

All member pages call the shared `apiFetch()` adapter in `apps/web/lib/api.ts`. The company API can preserve the existing paths and JSON shapes, or replace that adapter with its own client while leaving the UI intact.

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
