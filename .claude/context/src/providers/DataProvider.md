# DataProvider (`DataProvider.tsx`)

## Purpose
Owns the store and `SyncEngine`, triggers syncs, schedules reminders, and exports read hooks (`useHabits`, `useLogs`, `usePeriods` and so on).

## Sync triggers
App foreground, network regained, a 10-second check for due backed-off operations, a debounced `scheduleSync` after writes, and `useSyncOnFocus`.

## Rules
- Clears the cache when `cacheUserId` differs from the signed-in user.
- Reminders are for the owner only.
- `usePeriods` must keep returning `[]` for non-owners.

## Gotchas
- Any store change invalidates every `['store', ...]` query, so screens update automatically.
- On foreground, a device timezone change calls `PATCH /me`, so it needs to be online. It retries on the next foreground.
- If `SqliteStore` construction fails, it uses `MemoryStore`, and data doesn't survive a restart.
- The engine starts with `deviceId: 'pending'`, and it's replaced once read from `meta`.

## Related
`_shared/privacy-invariants.md`, `../sync/engine.md`
