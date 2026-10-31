# useDerived (`derived.ts`)

## Purpose
Combines habits, logs and settings into the day's score and streaks through `lib/progress.ts`.

## Rules
- Owners: period days become neutral dates computed locally.
- Viewers: no period data at all, and numbers come from the server summary.

## Gotchas
`useToday` uses the device timezone, and refreshes on foreground and every minute, to catch midnight and timezone changes.

## Related
`../lib/progress.md`, `serverSummary.md`
