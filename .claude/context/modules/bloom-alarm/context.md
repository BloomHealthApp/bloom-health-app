# modules/bloom-alarm/

## Purpose
Local Expo module behind Loud alarm. It's autolinked, and needs a development or store build. `requireOptionalNativeModule` returns null elsewhere, such as Expo Go, so the app falls back to the Alarm tone.

## Android
- `AlarmManager.setAlarmClock` fires once, so `AlarmFireReceiver` books the next day. A snooze (fixed 10 minutes) doesn't touch the daily schedule.
- The schedule is also kept in SharedPreferences, so `AlarmRestoreReceiver` can restore it after a reboot, time change or permission grant without React Native.
- `AlarmRingService` is a `systemExempted` foreground service, which Android allows for exact-alarm apps. It plays the system alarm sound on the alarm stream, raises that stream to maximum and restores it afterwards, and stops itself after 15 minutes if nobody responds.
- Uses `SCHEDULE_EXACT_ALARM`, which is denied by default on Android 14+, not `USE_EXACT_ALARM`, which Play restricts. Revoking it stops the app and cancels the alarms, and a later sync falls back to Alarm.
- If full-screen permission is missing, the alarm still rings from a high-priority notification, and Settings asks for it.
- Permissions are declared in the module's `AndroidManifest.xml`, so no config plugin is needed. The Play Console needs the full-screen intent declaration.

## iOS
- AlarmKit behind `#available(iOS 26.0, *)` and `canImport(AlarmKit)`, with a weekly recurrence on all seven days. It needs `NSAlarmKitUsageDescription` in `app.json` and an Xcode 26 build image.
- Stop only, no snooze. Snooze uses a countdown state, and Apple warns that without a widget extension the system may dismiss alarms and fail to alert. Add the extension before adding snooze.
- AlarmKit needs UUIDs, so reminder identifiers map to them through UserDefaults.

## Why
Notification text must stay generic (`_shared/privacy-invariants.md`), so titles come from `REMINDER_LABELS` and the module never sees cycle data.
