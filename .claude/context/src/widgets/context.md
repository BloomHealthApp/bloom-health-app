# src/widgets/

## Purpose
Android home-screen widgets.

| File | Purpose |
|---|---|
| `widgetData.ts` | Platform-neutral: owns `WidgetSnapshot`, builds it from scoring output, persists it, asks the adapter to redraw |
| `WidgetSync.tsx` | Mounted in `DataProvider`; re-publishes when inputs change and on foreground. Also the signed-out publisher, in the root shell |
| `widgetAdapter.ts` | Bridge to `react-native-android-widget` |
| `widgetTaskHandler.ts` | Headless task; registered from `index.ts` |
| `HealthWidgets.tsx` | Layouts: pure functions of snapshot and size |
| `svg.ts` | Renders artwork to SVG strings |
| `widgetTheme.ts` | Maps the app theme to widget colors |

## Rules
- The headless task only reads the last persisted snapshot: no network, no SQLite. It runs while the app is closed.
- Layouts use widget library primitives, with no hooks or React Native views.
- An iOS widget could later read the same snapshot without changing `widgetData.ts`.
- `svg.ts` serialises the real artwork, so no art is duplicated. An unsupported primitive throws, because it's a programming error.
- Viewer accounts see the owner's cached data, so they publish the same snapshot, read-only.

- Widgets use a simpler glass than the app: a see-through diagonal gradient with no border, from `widgetGlass`. `GlassLayer` can't be used because layouts have no React Native views. There's no blur, as the wallpaper can't be blurred.
- A widget sits on any wallpaper, so `WIDGET_GLASS_ALPHA` is higher than the app panels, and muted text is darker than in the app. A test checks text contrast on the panel over black and white for every theme and appearance.
- The snapshot stores `dark` as saved by the app, so a widget changes appearance the next time the app publishes, not when the phone changes while the app is closed.

## Why
- `widgetAdapter.ts` loads the library lazily, because importing it needs a native module that Expo Go and non-Android runtimes don't ship.
- The app may be closed for days when the OS asks for a redraw, so a stored snapshot is re-expressed for the current day: a new day starts at 0%, and the streak only survives if the stored day counted or was neutral, and no whole day was skipped.

## Gotchas
Snapshot states: `ready`, `noHabits`, `signedOut`, `unopened`.

## Related
`README.md` (Android home-screen widget), `../components/context.md` (Mascot)

## Android release builds
R8 is off (`enableMinifyInReleaseBuilds: false` through `expo-build-properties` in `app.json`). `react-native-android-widget` brings in WorkManager 2.8.1, and R8 removed the constructor of `WorkDatabase_Impl`, which WorkManager creates by reflection. The app then crashed at launch, before any JS ran, and only in release builds. Before turning R8 back on, add keep rules and test a release build on a device.
