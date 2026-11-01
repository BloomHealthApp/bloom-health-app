# modules/bloom-steps/

## Purpose
Local Expo module that reads daily step totals from HealthKit (iOS) and Health Connect (Android). It's autolinked, and needs a development or store build. `requireOptionalNativeModule` returns null elsewhere, such as Expo Go, and Settings then says step data isn't available.

## Rules
- Read-only. It never writes to either health store.
- Totals come from aggregate queries (`HKStatisticsQuery`, `aggregate()`), which remove overlap between sources. Don't add up raw samples.
- Day bounds use the device's timezone.

## Why
A local module avoids depending on third-party support for the current SDK and React Native versions. `expo-sensors` Pedometer can't read a date range on Android.

## Gotchas
- iOS doesn't reveal a denied read: it looks like no data. `lib/deviceSteps.ts` therefore ignores totals of 0 and drops.
- Android needs `minSdkVersion` 26 (`app.json`), which Health Connect requires. `StepsRationaleActivity` and its alias are required for the permission screen.
- Publishing needs the HealthKit capability from Apple and the Play Console health data declaration. Permission text must say viewers can see steps.
- Results are read when the app runs. Background updates aren't built.

## Related
`src/features/autoSteps.ts`, `src/features/useAutoSteps.ts`, `src/lib/deviceSteps.ts`
