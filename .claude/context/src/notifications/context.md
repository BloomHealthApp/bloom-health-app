# src/notifications/

## Purpose
`scheduler.ts` is pure planning and idempotent scheduling against an injected API, so permission denial, timezone changes and duplicates are unit-testable. `expoAdapter.ts` connects it to `expo-notifications`.

## Rules
- Local reminders only, and only for owners.
- Stable identifiers (`bubu.reminder.<key>`) and a plan signature that includes the timezone mean re-running never duplicates, and a timezone change reschedules.
- The period reminder has its own identifier outside `ID_PREFIX`, so `syncReminders` never touches it. Its text stays generic.

## Why
`expoAdapter.ts` loads `expo-notifications` lazily, because some runtimes don't ship its native code, and importing it eagerly would crash the app at startup.

## Related
`_shared/privacy-invariants.md`
