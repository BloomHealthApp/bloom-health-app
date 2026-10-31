# src/api/mock/

## Purpose
`mockServer.ts` implements `docs/api-contract.md` in memory for demo mode (`EXPO_PUBLIC_USE_MOCK_API=true`, or `npm run start:mock`). It exposes a fetch-compatible `mockFetch`, so the real `ApiClient` (refresh on 401, zod parsing) still runs.

## Rules
- Keep it in step with the contract and the service's behavior, including privacy: viewers get no period rows from `/sync/pull` and 403 on `/periods`, and `/stats/summary` counts the owner's period days as neutral with `restDay` never saying why.
- Users get `ownerAvatar` on every response, and avatars are validated against the allowlist.
- Sign-up creates a new owner with their own empty space, default habits and settings, and no history.

## Demo data
- Accounts: `anu@example.com` / `+919876543210` (owner), `aman@example.com` / `+919876543211` (viewer). The code is always `123456`.
- The owner has 28 days of deterministic demo history, and three finished periods about 29 days apart, the latest a week ago.

## Gotchas
Data is lost on reload. Several test suites in `src/api/__tests__` rely on the mock, so changing it can fail them.
