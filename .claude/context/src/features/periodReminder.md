# Period reminder opt-in (`periodReminder.ts`)

## Purpose
Local-only preference, stored per user in AsyncStorage, for the "may start soon" reminder. It's never sent to the server.

## Rules
`applyPeriodReminder` never throws, because Expo Go may have no native notifications module.

## Related
`../notifications/context.md`, `_shared/privacy-invariants.md`
