# Viewer summary (`serverSummary.ts`)

## Purpose
Viewers get streak and day flags from `GET /stats/summary`, because they never receive period data. The last summary is cached in the store's `meta` table, so Home shows the right numbers offline.

## Gotchas
- Requests the last 365 days, which stays within the service's 366-day range limit.
- The query key includes `sync.lastSyncedAt`, so each completed sync refetches.
- Returns `null` for owners, and when nothing is cached yet.
