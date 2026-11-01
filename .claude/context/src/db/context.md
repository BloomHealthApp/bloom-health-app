# src/db/

## Purpose
`store.ts` defines the `Store` interface. `SqliteStore` is the real one, and `MemoryStore` is used by tests and as a fallback.

## SQLite
- `entities`: JSON blobs keyed by type and id.
- `periods`: its own table, indexed by start date, for private owner data.
- `sync_ops`: the queue.
- `meta`: key-value data such as the sync cursor, `deviceId`, `cacheUserId`, the active workout and the viewer's cached summary.

## Rules
- Add schema changes as a new `if (v < N)` step and raise `SCHEMA_VERSION`. Never edit an earlier step.
- Keep `MemoryStore` behavior matching `SqliteStore`.

## Why
Transactions are serialised through `txChain`, because SQLite doesn't support nested or concurrent ones on one connection.

## Gotchas
- Every `SqliteStore` method waits for the open and schema steps, because NetInfo, AppState and focus listeners can call in before `DataProvider` runs `init`. Add new methods through `connection()`, not `this.db`.
- `clearAll` runs only when a different user signs in (`DataProvider`). Signing out doesn't clear SQLite, so the previous user's cache, including periods, stays on the device until then.
- Change notifications are coalesced to one at the end of a transaction.
