# Period tracker: privacy invariants (do not weaken)

- Period data belongs to the owner. A viewer must never receive, cache, queue or render it.
  - `SyncEngine.mutate` throws for a non-owner `period` write.
  - `SyncEngine.pull` ignores `changes.periods` for non-owners, and deletes any `period` rows already cached (for example from an earlier role).
  - `usePeriods` returns `[]` for non-owners.
  - The Calendar tab mounts `PeriodsPanel` only when `isPeriodTrackerOn` is true. The tracker has no route or Home card of its own.
- Viewers get streaks and day flags only from `GET /stats/summary`. `restDay` is generic, and the UI never says why a day is a rest day.
- Notification text stays generic, because notifications show on the lock screen. The word "period" only appears inside the app.
- The "period may start soon" opt-in is stored locally and never sent to the server.
- Cycle figures are estimates, never medical advice.
- Gender only drives the tracker default, and is never shown to other users.
- Changing gender to male or clearing it also resets the tracker to its default, so a hidden opt-in can't linger (`lib/profile.ts`).
