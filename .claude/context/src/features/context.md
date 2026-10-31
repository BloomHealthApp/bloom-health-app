# src/features/

## Purpose
Hooks and small mounted components joining the store, sync and pure logic.

| File | Purpose | Note |
|---|---|---|
| `actions.ts` | All owner writes | [actions.md](actions.md) |
| `derived.ts` | Score, streaks and today | [derived.md](derived.md) |
| `serverSummary.ts` | Viewer progress | [serverSummary.md](serverSummary.md) |
| `periodReminder.ts` | Period reminder opt-in | [periodReminder.md](periodReminder.md) |
| `PeriodReminderSync.tsx` | Keeps that reminder in step with the estimate; renders nothing | |
| `useActiveWorkout.ts` | Running workout state, persisted in SQLite `meta` | |
| `useSyncOnFocus.ts` | Sync on focus, with optional polling | |
