# Offline-first writes

## Rules
- Every owner write goes through `useActions` → `SyncEngine.mutate`: optimistic write to the store, plus a queued operation with a stable `operationId`. Then it syncs.
- Screens read from the store (`useEntities` and friends), not from REST endpoints.
- Profile changes are the exception: `PATCH /me` is a direct, online call.
- A sign-in, viewer or read-only path must still work offline from cached data.

## Related
`src/sync/engine.md`, `src/features/actions.md`, `docs/api-contract.md` (Sync)
