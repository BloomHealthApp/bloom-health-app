# Progress (`progress.ts`)

## Purpose
Pure derivation of today's score and streaks. Shared by the Home screen hook (`features/derived.ts`) and the widget snapshot, so scoring rules live in one place.

## Rules
- Owner: everything is computed locally from synced logs, plus the owner's period days as `neutralDates`.
- Viewer: never receives period data, so streaks and per-day success and rest flags come from `GET /stats/summary` (`serverSummary`, cached for offline). Local scoring only fills in the habit counts.

## Gotchas
The window starts at the earliest log, or 60 days back, and ends today.
