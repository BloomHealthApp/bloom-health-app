# src/features/

## Purpose
Hooks and small mounted components joining the store, sync and pure logic.

| File | Purpose | Note |
|---|---|---|
| `actions.ts` | All owner writes | [actions.md](actions.md) |
| `derived.ts` | Score, streaks and today | [derived.md](derived.md) |
| `serverSummary.ts` | Viewer progress | [serverSummary.md](serverSummary.md) |
| `periodReminder.ts` | Period reminder opt-in | [periodReminder.md](periodReminder.md) |
| `reminderModes.ts` | Alert type per reminder, stored per user on this device | [reminderModes.md](reminderModes.md) |
| `useAlarmPreview.ts` | Plays the alarm tone for the Settings preview; lazy-loads `expo-audio`, stops after 15 seconds or when backgrounded | |
| `PeriodReminderSync.tsx` | Keeps that reminder in step with the estimate; renders nothing | |
| `useActiveWorkout.ts` | Running workout state, persisted in SQLite `meta` | |
| `autoSteps.ts` | Auto-track opt-in, stored per user on this device, and safe wrappers around `modules/bloom-steps` | |
| `useAutoSteps.ts` | Fills the Steps habit on Home focus, foreground and pull-to-refresh; rules are in `lib/deviceSteps.ts` | |
| `useSyncOnFocus.ts` | Sync on focus, with optional polling | |
