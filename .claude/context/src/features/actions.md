# useActions (`actions.ts`)

## Purpose
All owner writes: logs, habits, workouts, settings and periods. Each one writes locally and queues through `SyncEngine.mutate`, then schedules a sync.

## Rules
- Every write calls `guard()`, which throws `ReadOnlyError` for non-owners.
- `savePeriod` validates with `validatePeriod` first, because an offline write can't rely on the server.

## Why
- Daily log writes only send `source` when it's `device`. The service stores an omitted source as `manual`, so other logs keep working against an older service.
- Archiving a habit is an upsert with `isActive: false`. A delete op would tombstone the habit, whereas the service keeps habits and their logs.
- `sundayRest` is only sent once known, because older services reject unknown fields. It's always repeated, because un-sent edits coalesce and the latest payload replaces the earlier one.

## Gotchas
- `addSteps` runs adds one at a time, because each reads the total before writing. `addToLog` has no such queue, so quick water taps can still race.
`restDayMode` isn't in the settings payload, so the app can't change it.

## Related
`_shared/offline-first.md`, `../sync/engine.md`
