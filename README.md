# Bubu Bloom (mobile app)

A private wellness / habit tracker for two people (an **owner** who logs, and an invited **viewer** who follows along read-only).
Expo SDK 58 + Expo Router + strict TypeScript, TanStack Query, `expo-sqlite` (offline cache + sync queue),
`expo-secure-store` (tokens), `expo-notifications`, `react-native-svg`, `react-native-reanimated`, Nunito.

> Bubu Bloom is a personal habit tracker, not medical advice.

The app talks **only** to the REST API described in `../docs/api-contract.md` (v1). It never connects to MongoDB and ships
no database credentials.

## Quick start

```bash
npm install
cp .env.example .env        # then edit
npx expo start              # press i / a, or scan the QR code in Expo Go
```

| Variable | Meaning |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Service base URL, no trailing slash and no `/v1` (e.g. `http://192.168.1.20:8080`). On a physical device use your computer's LAN IP, not `localhost`. |
| `EXPO_PUBLIC_USE_MOCK_API` | `true` runs against an in-memory mock of the contract (default `false`). |

### Demo / mock mode (no backend needed)

```bash
EXPO_PUBLIC_USE_MOCK_API=true npx expo start     # or: npm run start:mock
```

Sign in with `anu@example.com` / `+919876543210` (owner) or `aman@example.com` / `+919876543211` (viewer), or tap
"Create account" to register a new owner with an empty space. The code is always `123456`.
The mock (`src/api/mock/mockServer.ts`) is a fetch-compatible server that implements auth, `/me`, `/settings`, `/habits`,
`/logs`, `/workouts`, `/stats/summary`, `/sync/push` (idempotent operationIds, versions, conflicts, LWW for daily logs,
viewer 403) and `/sync/pull` (cursor, tombstones), seeded with the 8 default habits and 4 weeks of demo history.
It lives in JS memory, so data resets when the app reloads. Because it is served through the real `ApiClient`, token
refresh and response validation are exercised too.

### Against the real service

1. Start `bubu-bloom-service` (see its README).
2. Set `EXPO_PUBLIC_API_BASE_URL`, leave `EXPO_PUBLIC_USE_MOCK_API=false`, run `npx expo start`.
3. Create an account (name, phone, email) or sign in with your phone or email, then enter the 6-digit code emailed to the
   email on your account. There are no passwords.

## Scripts

```bash
npm run typecheck     # tsc --noEmit
npm test              # Jest (jest-expo)
npm run lint          # eslint src
npx expo-doctor
```

## Builds (EAS)

`eas.json` defines `preview` (internal distribution), `preview-android` (**APK**) and `preview-ios` (internal/ad-hoc,
needs an Apple developer account and registered devices), plus `development` and `production`.
Set the service URL for the build (edit `env` in `eas.json` or use `eas env:create`), then:

```bash
npm i -g eas-cli && eas login
eas build -p android --profile preview-android   # produces an installable .apk
eas build -p ios --profile preview-ios           # internal distribution build
```

(These builds were not run while developing this repo.)

## Project layout

```
src/app/            Expo Router: (auth)/{welcome,signup,signin,otp}, (tabs)/{index,progress,calendar,settings},
                    habit/[id] (log a value), habit/form (create/edit), habits, workout, day/[date], sync-issues
src/lib/            scoring.ts (daily %, thresholds, rest days, streaks, milestones), dates.ts (tz-aware),
                    workoutTimer.ts (timestamp-derived), format/messages/defaults
src/api/            typed client (refresh-on-401, zod-parsed responses) + mock/ in-memory contract server
src/db/             Store interface, SqliteStore (expo-sqlite), MemoryStore (tests)
src/sync/           engine.ts (queue, push/pull, conflicts), backoff.ts
src/providers/      AuthProvider (SecureStore tokens), DataProvider (store+engine, focus/network/timezone triggers)
src/notifications/  scheduler.ts (pure, idempotent), expoAdapter.ts
src/components/     HabitCard, ProgressRing, WaterTracker, StepsCard, WorkoutTimer, StreakCard, WeeklyProgressChart,
                    CalendarDayCell, ThemePicker, BubuMascot(+Static), EmptyState, ConfirmationDialog, SyncStatusChip ...
src/theme/          tokens, three pastel themes, ThemeProvider (persisted locally + saved to profile)
assets/mascot/      README: how to swap in your own mascot art
src/widgets/        Android home-screen widget (see "Android home-screen widget"); index.ts is the app entry
```

## How it works

- **Offline-first.** Every owner write goes to SQLite (optimistic) and a `sync_ops` queue with a stable `operationId`.
  Un-sent upserts to the same entity are coalesced. `POST /sync/push` (<=100 ops, in order) results are applied per op:
  `applied|duplicate` replace the cache with the server record; `conflict` replaces the cache with the server record and
  lists the op under **Settings > Sync issues**; `rejected` is never retried. Network/5xx/429 errors back off 2 s to 5 min
  with jitter (honoring `Retry-After`), and an op is marked `failed` after 8 attempts (manual retry in Sync issues).
  `GET /sync/pull` loops while `hasMore`, applies each page in one SQLite transaction together with the cursor, and does not
  overwrite entities that still have un-pushed local edits. Status chip: `synced | pending(n) | failed(n) | offline`.
- **Viewer.** Never pushes; all edit controls are hidden/disabled and a "Viewing Anu's progress" banner is shown.
  It pulls on foreground, tab focus, pull-to-refresh and every 30 s while Home is focused.
- **Scoring.** `daily % = completed eligible / eligible * 100`; a day succeeds at `dailyThreshold` (default 80).
  Eligible = active, scheduled that weekday, created on/before that date, not `skipped`. Partial progress scores 0.
  Streaks: today in progress never breaks the streak; rest days are neutral (`restDayMode: neutral`) or count as a
  success (`counts`). Milestones 3/7/14/30/100. Dates are computed in the device timezone (synced to your profile).
- **Workout timer.** Persists `startedAt` + accumulated pause time; elapsed is always derived from timestamps, so it
  survives backgrounding and app kill. Manual entry and multiple sessions per day are supported.
- **Reminders.** Owner only. Stable notification identifiers (`bubu.reminder.<key>`) + a plan signature (incl. timezone)
  mean re-running never duplicates; a timezone change reschedules; denied permission shows an in-app explanation.
- **Accessibility.** Labels/roles on interactive elements, 44 pt minimum touch targets, no color-only status,
  reduced-motion support for the mascot animation.

## Android home-screen widget

Two Android widgets, built with [`react-native-android-widget`](https://github.com/sAleksovski/react-native-android-widget)
(`^0.22.1`; Expo config plugin, New Architecture / TurboModule): **Bubu streak** (2x2: Bubu + current streak) and
**Bubu daily progress** (4x2: streak, longest streak, today's ring, "X of Y habits done", an encouraging message).
Both use the active app theme and the original Bubu mascot, and tapping opens the app. iOS is not implemented (the data
layer is platform-neutral so an iOS widget can reuse it later).

**Build.** The widget is native code, so it does **not** appear in Expo Go (the app still runs there; the widget code is
skipped). Create a development or preview build:

```bash
npx eas-cli@latest build -p android --profile preview-android     # installable .apk with the widgets
npx eas-cli@latest build -p android --profile development         # dev client (then: npx expo start --dev-client)
```

Locally: `npx expo prebuild --platform android` then `npx expo run:android` (the generated `android/` is not committed).

**Add it to the home screen.** Install the build, open Bubu Bloom once and sign in (this writes the first snapshot), then
long-press an empty spot on the Android home screen > Widgets > Bubu Bloom > drag *Bubu streak* or *Bubu daily progress*.
Before the first open it shows "Open Bubu Bloom to get started"; after sign-out, "Open Bubu Bloom to sign in".

**Code.**

```
index.ts                         app entry (package.json "main"): imports expo-router/entry + registers the widget task
src/lib/progress.ts              pure today-score + streak derivation, shared by Home (features/derived.ts) and the widget
src/widgets/widgetData.ts        WidgetSnapshot, buildSnapshot, AsyncStorage persistence, publishSnapshot / publishSignedOut
src/widgets/WidgetSync.tsx       republishes on log/sync/day/theme change, app foreground and sign-out (mounted in app/_layout)
src/widgets/widgetAdapter.ts     lazy, guarded access to the native module (no-op in Expo Go / Jest / iOS)
src/widgets/BubuWidgets.tsx      the two layouts;  widgetTaskHandler.ts  headless renderer used while the app is closed
src/widgets/svg.ts               mascot / flame / ring as SVG strings (the mascot reuses components/mascotArt.tsx)
src/widgets/widgetTheme.ts       app theme -> widget colours;  assets/widget/  picker preview images
```

The widget shows the last snapshot the app wrote; while the app is closed it only redraws that snapshot (a new day shows
0 % and drops the streak if a day was missed). Open the app to refresh real numbers. Widget names/sizes live in the plugin
entry in `app.json`.

## Mascot

Bubu is an original SVG (round blob bear with a sprout). To use your own art see `assets/mascot/README.md`.

## Known limitations

See the end-of-task report: not run on a simulator/device, EAS builds not executed, a few contract ambiguities
(sync payload shapes, `restDayMode` not patchable, `between` semantics) are documented in code comments.
