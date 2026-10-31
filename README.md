# Bloom Health (mobile app)

A private wellness / habit tracker for two people (an **owner** who logs, and an invited **viewer** who follows along read-only).
Expo SDK 58 + Expo Router + strict TypeScript, TanStack Query, `expo-sqlite` (offline cache + sync queue),
`expo-secure-store` (tokens), `expo-notifications`, `react-native-svg`, `react-native-reanimated`, Nunito.

> Bloom Health is a personal habit tracker, not medical advice.

The app talks **only** to the REST API described in `../docs/api-contract.md` (v1). It never connects to MongoDB and ships
no database credentials.

Conventions and project context for contributors are in [`CLAUDE.md`](CLAUDE.md) and [`.claude/context/`](.claude/context/README.md).

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

1. Start `bloom-health-service` (see its README).
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

## Profile avatars

Each user picks one of fifteen original Bloom avatars (`bubu-01` ... `bubu-15`: Classic, Cloud Hat, Candy Stick, Heart Specs,
Star Clip, Flower Crown, Dreamy, Sweet Tooth, Balloon, Ball Cap, Cool Shades, Big Beard, Headphones, Gym Bro, Bow Tie). The server stores only the id (`PATCH /me {avatar}`; anything outside the allowlist is
`400`, `null` clears it); the art is drawn locally with `react-native-svg` from the shared Bloom pieces in `components/mascotArt.tsx`, in a fixed
palette that does not follow the theme. Avatars appear on Home (next to the greeting), in Settings > Profile (tap to change) and, for viewers,
in the "Viewing <owner>'s progress" banner (`ownerAvatar`). Right after the first sign-up the one-time "Choose your Bloom" screen offers the grid
with Continue / Skip (per-account flag in AsyncStorage, so it never reappears after a skip). Accounts that already exist without an avatar see it
once too. Adding a tenth avatar needs an app release and an allowlist update in the service.

## Gender, period tracker and Sunday streaks

- **Gender** is optional (`female`, `male`, `other`, `prefer_not_to_say`): a chip row on sign-up and in Settings > Profile (tap the selected chip to clear).
- **Period tracker** (private). On by default for `female`; `other` / `prefer not to say` can switch it on in Settings > Profile; hidden for male,
  unset gender and for viewers. The tracker screen (`src/app/periods.tsx`, reachable from a small Home card and Settings) has a month calendar with period
  days marked and the estimated window softly shaded, Start/End period, flow (light/medium/heavy), symptom and mood chips, a note, history with edit/delete
  and a stats card. Estimates only: next start = last start + the average of up to the last 6 start-to-start gaps, shown only with at least 2 cycles; a
  "may be late" note appears once today is past the +/-2 day window. It is **not medical advice**. An optional local "heads-up" notification two days before the
  estimate uses neutral text (the word period never appears on the lock screen) and is unavailable in Expo Go.
- **Privacy.** Period rows sync as entity `period`, owner only: viewers never receive them (the service filters them), never see the tracker UI, and nothing about
  periods goes into widget snapshots, notification text or logs. Data is stored in the same MongoDB as the rest (not end-to-end encrypted); privacy is enforced
  by server-side filtering.
- **Streaks.** Sundays never break a streak (setting `sundayRest`, default on; Settings > Daily goal) and, for owners with the tracker on, neither do period days.
  Both are neutral days: an unlogged one neither breaks nor extends the streak, one where you reach the goal counts as a normal success. Calendar, week chart
  and heatmap draw them as soft rest cells without a reason. **Viewers** cannot compute this locally (no period data), so their streaks and day flags come
  from `GET /stats/summary` (cached for offline); owners compute locally from logs plus their own periods.
- Mock mode: Anu (female owner) has three demo periods; Aman (male viewer) sees none.

## Project layout

```
src/app/            Expo Router: (auth)/{welcome,signup,signin,otp}, (tabs)/{index,progress,calendar,settings},
                    habit/[id] (log a value), habit/form (create/edit), habits, workout, day/[date], sync-issues,
                    choose-avatar (shown once after first sign-up)
src/lib/            scoring.ts (daily %, thresholds, rest days, streaks, milestones), dates.ts (tz-aware),
                    workoutTimer.ts (timestamp-derived), format/messages/defaults
src/api/            typed client (refresh-on-401, zod-parsed responses) + mock/ in-memory contract server
src/db/             Store interface, SqliteStore (expo-sqlite), MemoryStore (tests)
src/sync/           engine.ts (queue, push/pull, conflicts), backoff.ts
src/providers/      AuthProvider (SecureStore tokens), DataProvider (store+engine, focus/network/timezone triggers)
src/notifications/  scheduler.ts (pure, idempotent), expoAdapter.ts
src/components/     HabitCard, ProgressRing, WaterTracker, StepsCard, WorkoutTimer, StreakCard, WeeklyProgressChart,
                    CalendarDayCell, ThemePicker, Mascot(+Static), EmptyState, ConfirmationDialog, SyncStatusChip ...
src/lib/cycle.ts       pure cycle math (averages, next-start estimate, neutral dates); periodRules/periodsView/profile: tracker rules
src/avatars/        fifteen Bloom profile avatars: catalog (ids/labels), AvatarArt (react-native-svg), Avatar, AvatarPicker,
                    avatarPrompt (one-time "Choose your Bloom" flag)
src/theme/          tokens, five themes, ThemeProvider (persisted locally + saved to profile)
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
  Each reminder can be a notification, an alarm tone, or a loud alarm (`modules/bloom-alarm`, needs a development or store build).
- **Accessibility.** Labels/roles on interactive elements, 44 pt minimum touch targets, no color-only status,
  reduced-motion support for the mascot animation.

## Android home-screen widget

Two Android widgets, built with [`react-native-android-widget`](https://github.com/sAleksovski/react-native-android-widget)
(`^0.22.1`; Expo config plugin, New Architecture / TurboModule): **Bloom streak** (2x2: Bloom + current streak) and
**Bloom daily progress** (4x2: streak, longest streak, today's ring, "X of Y habits done", an encouraging message).
Both use the active app theme and the original Bloom mascot, and tapping opens the app. iOS is not implemented (the data
layer is platform-neutral so an iOS widget can reuse it later).

**Build.** The widget is native code, so it does **not** appear in Expo Go (the app still runs there; the widget code is
skipped). Create a development or preview build:

```bash
npx eas-cli@latest build -p android --profile preview-android     # installable .apk with the widgets
npx eas-cli@latest build -p android --profile development         # dev client (then: npx expo start --dev-client)
```

Locally: `npx expo prebuild --platform android` then `npx expo run:android` (the generated `android/` is not committed).

**Add it to the home screen.** Install the build, open Bloom Health once and sign in (this writes the first snapshot), then
long-press an empty spot on the Android home screen > Widgets > Bloom Health > drag *Bloom streak* or *Bloom daily progress*.
Before the first open it shows "Open Bloom Health to get started"; after sign-out, "Open Bloom Health to sign in".

**Code.**

```
index.ts                         app entry (package.json "main"): imports expo-router/entry + registers the widget task
src/lib/progress.ts              pure today-score + streak derivation, shared by Home (features/derived.ts) and the widget
src/widgets/widgetData.ts        WidgetSnapshot, buildSnapshot, AsyncStorage persistence, publishSnapshot / publishSignedOut
src/widgets/WidgetSync.tsx       republishes on log/sync/day/theme change, app foreground and sign-out (mounted in app/_layout)
src/widgets/widgetAdapter.ts     lazy, guarded access to the native module (no-op in Expo Go / Jest / iOS)
src/widgets/HealthWidgets.tsx      the two layouts;  widgetTaskHandler.ts  headless renderer used while the app is closed
src/widgets/svg.ts               mascot / flame / ring as SVG strings (the mascot reuses components/mascotArt.tsx)
src/widgets/widgetTheme.ts       app theme -> widget colours;  assets/widget/  picker preview images
```

The widget shows the last snapshot the app wrote; while the app is closed it only redraws that snapshot (a new day shows
0 % and drops the streak if a day was missed). Open the app to refresh real numbers. Widget names/sizes live in the plugin
entry in `app.json`.

## Mascot

Bloom is an original SVG (round blob bear with a sprout). To use your own art see `assets/mascot/README.md`.

## Known limitations

See the end-of-task report: not run on a simulator/device, EAS builds not executed, a few contract ambiguities
(sync payload shapes, `restDayMode` not patchable, `between` semantics) are documented in code comments.
