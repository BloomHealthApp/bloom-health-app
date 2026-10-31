# src/notifications/

## Purpose
`scheduler.ts` is pure planning and idempotent scheduling against injected APIs, so permission denial, timezone changes and duplicates are unit-testable. `expoAdapter.ts` connects it to `expo-notifications`, and `alarmAdapter.ts` connects it to `modules/bloom-alarm`.

Each daily reminder has a mode: `notification` (default), `alarm` (bundled tone, can be muted by silent mode) or `loudAlarm` (native alarm that rings through silent mode).

## Rules
- Local reminders only, and only for owners.
- Stable identifiers (`bubu.reminder.<key>`) and a plan signature that includes the timezone mean re-running never duplicates, and a timezone change reschedules.
- A reminder lives in one system at a time. `syncReminders` cancels in both before scheduling, so a mode change can't make it fire twice.
- Loud alarm falls back to `alarm` when it's unavailable, not permitted, or native scheduling throws. `SyncResult.loudAlarmFallback` says why, and Settings shows it. Denied notification permission cancels loud alarms too.
- `askAlarmPermission` is only for a user's tap on Loud alarm or Allow alarms, because on Android it opens a system settings screen.
- Android channel sound and importance are frozen once created, so changing the `alarms` channel needs a new channel ID. It deliberately doesn't use the ALARM audio usage, which would ring through silent mode.
- The period reminder has its own identifier outside `ID_PREFIX`, so `syncReminders` never touches it. Its text stays generic.

## Why
`expoAdapter.ts` loads `expo-notifications` lazily, because some runtimes don't ship its native code, and importing it eagerly would crash the app at startup.

## Related
`_shared/privacy-invariants.md`
