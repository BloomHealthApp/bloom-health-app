# Reminder alert types (`reminderModes.ts`)

## Purpose
Stores each reminder's mode and loud-alarm volume locally, per user. It isn't synced: sounds and alarm permissions belong to the device, and the service rejects unknown `Reminder` fields. A new phone or reinstall starts at Notification.

## Rules
Reads never throw and drop unknown values, so a bad stored value just means Notification. `DataProvider.refreshReminders` re-reads it on every run, so save before refreshing.

## Related
`../notifications/context.md`
