# src/sync/

## Purpose
- [engine.md](engine.md): `SyncEngine`, the queue and push/pull.
- `backoff.ts`: exponential 2 seconds to 5 minutes with ±20% jitter, and `MAX_ATTEMPTS` of 8.

## Related
`_shared/offline-first.md`, `docs/api-contract.md` (Sync)
