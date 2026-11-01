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
- Volume only reaches Android loud alarms, because the app controls that stream. Alarm-mode tones follow the phone's notification volume and AlarmKit has no volume API, so don't offer a slider for them. Volume is in the plan signature only for loud alarms.
- Android channel sound and importance are frozen once created, so changing a channel's sound needs a new channel ID. It deliberately doesn't use the ALARM audio usage, which would ring through silent mode.
- The period reminder has its own identifier outside `ID_PREFIX`, so `syncReminders` never touches it. Its text stays generic.

## Why
`expoAdapter.ts` loads `expo-notifications` lazily, because some runtimes don't ship its native code, and importing it eagerly would crash the app at startup.

## Related
`_shared/privacy-invariants.md`

## Alert types in Settings
Each reminder offers `notification`, `alarm` and `loudAlarm` on their own line under the name and time, because three options don't fit beside them on a phone. The first tap selects an option, and a second tap previews it.

## Notification sound
`assets/sounds/notification.wav` (about 2 seconds) plays for every reminder in `notification` mode and for the period reminder, including while the app is open. Android uses the `reminders_sound` channel, which replaced the silent `reminders` channel. Renaming the signature keys makes existing installs reschedule once, because reminders already scheduled stay on the channel they were created with.

## Alarm tone
`assets/sounds/alarm.wav` plays the tone twice (about 39 seconds). Android alarm notifications, Loud alarm on Android and the Settings preview all use it. `alarm_ios.wav` is a single play (about 19.5 seconds) for iOS notifications, because iOS plays its default sound instead of any notification sound over 30 seconds. Keep both as WAV, because iOS notification sounds don't support MP3. Keep the name `alarm.wav`: Android channels store the sound by name, so this also updates the frozen `alarms` channel on existing installs. A native rebuild is needed.
