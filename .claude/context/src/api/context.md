# src/api/

## Purpose
- `client.ts`: `ApiClient`, the only code that calls the backend. See [client.md](client.md).
- `errors.ts`: `ApiError`, `NetworkError` and `isRetryable`.
- `mock/`: in-memory contract server for demo mode. See [mock/context.md](mock/context.md).

`docs/api-contract.md` is the source of truth for shapes, and `src/types/api.ts` mirrors it.

## All API calls
All paths are under `/v1`. Auth means a bearer token is sent.

| Method | Endpoint | Auth | Called from |
|---|---|---|---|
| `requestSignUp` | `POST /auth/signup/request` | no | `AuthProvider` |
| `requestSignIn` | `POST /auth/signin/request` | no | `AuthProvider` |
| `verifyOtp` | `POST /auth/otp/verify` | no | `AuthProvider` |
| (internal) `doRefresh` | `POST /auth/refresh` | no | `ApiClient` itself |
| `logout` | `POST /auth/logout` | no | `AuthProvider` |
| `getMe` | `GET /me` | yes | `AuthProvider` |
| `patchMe` | `PATCH /me` | yes | settings screen, choose-avatar screen, `DataProvider` |
| `getStats` | `GET /stats/summary` | yes | `features/serverSummary.ts` (viewers) |
| `syncPush` | `POST /sync/push` | yes | `SyncEngine` |
| `syncPull` | `GET /sync/pull` | yes | `SyncEngine` |
| `getSettings` | `GET /settings` | yes | not called by the app |
| `listHabits` | `GET /habits` | yes | not called by the app |
| `listLogs` | `GET /logs` | yes | not called by the app |
| `listWorkouts` | `GET /workouts` | yes | not called by the app |
| `listPeriods` | `GET /periods` | yes | not called by the app |
| `health` | `GET /health` | no | not called by the app |

## Gotchas
- `patchMe`'s type doesn't include `phone`, although the contract allows it, so the app can't change a phone number yet.
- The contract's REST writes (`POST /habits` and so on) have no client methods, because writes go through sync.
- When adding a call, update this table and the mock server.

## Related
`_shared/external-services.md`, `_shared/offline-first.md`
