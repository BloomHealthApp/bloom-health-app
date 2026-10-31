# useActions (`actions.ts`)

## Purpose
All owner writes: logs, habits, workouts, settings and periods. Each one writes locally and queues through `SyncEngine.mutate`, then schedules a sync.

## Rules
- Every write calls `guard()`, which throws `ReadOnlyError` for non-owners.
- `savePeriod` validates with `validatePeriod` first, because an offline write can't rely on the server.

## Why
- Archiving a habit is an upsert with `isActive: false`. A delete op would tombstone the habit, whereas the service keeps habits and their logs.
- `sundayRest` is only sent once known, because older services reject unknown fields. It's always repeated, because un-sent edits coalesce and the latest payload replaces the earlier one.

## Gotchas
`restDayMode` isn't in the settings payload, so the app can't change it.

## Related
`_shared/offline-first.md`, `../sync/engine.md`
