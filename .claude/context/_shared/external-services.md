# External services and dependencies

## Backend
| Service | Used for | Code | Configuration |
|---|---|---|---|
| `bloom-health-service` | Auth, profile, sync and viewer stats | `src/api/client.ts` | `EXPO_PUBLIC_API_BASE_URL` (no trailing slash, no `/v1`) |

- The app never talks to MongoDB, and no database credentials belong in it. `EXPO_PUBLIC_*` values are bundled into the app, so never put secrets in them.
- `docs/api-contract.md` is meant to be the shared source of truth, and the service keeps its own copy.
- `EXPO_PUBLIC_USE_MOCK_API=true` swaps the backend for `src/api/mock/mockServer.ts`.

## Build and delivery
| Service | Used for | Notes |
|---|---|---|
| EAS Build, Submit | Builds and store submission | `eas.json`: profiles `development`, `preview`, `preview-android`, `preview-ios`, `production`. Native folders are generated, so configure through `app.json`. |

## On-device modules
| Module | Used for | Code | When it's missing |
|---|---|---|---|
| `expo-sqlite` | Entity cache, sync queue, metadata | `src/db/sqliteStore.ts` | `DataProvider` falls back to `MemoryStore` if construction fails |
| `expo-secure-store` | Tokens | `src/auth/tokenStore.ts` | Memory cache for the session (e.g. web) |
| `@react-native-async-storage/async-storage` | Cached user, flags and preferences | providers, `features/periodReminder.ts`, `avatars/avatarPrompt.ts`, `widgets/widgetData.ts` | Reads fall back to safe defaults |
| `expo-notifications` | Local reminders only, no push | `src/notifications/expoAdapter.ts` | Lazy-loaded; reminders become unavailable (e.g. some Expo Go builds) |
| `modules/bloom-alarm` (local Expo module) | Loud alarm: AlarmKit on iOS 26+, full-screen ringing on Android | `src/notifications/alarmAdapter.ts` | Optional native module; falls back to the Alarm tone |
| `expo-audio` | Alarm tone preview in Settings | `src/features/useAlarmPreview.ts` | Lazy-loaded; the play button does nothing |
| `react-native-android-widget` | Android home-screen widgets `BubuSmall` and `BubuMedium` | `src/widgets/widgetAdapter.ts` | Lazy-loaded; no-op in Expo Go and off Android |
| `@react-native-community/netinfo` | Online state for sync | `src/providers/DataProvider.tsx` | |

## Main libraries
| Library | Used for |
|---|---|
| `expo-router` | Navigation; routes in `src/app/` |
| `@tanstack/react-query` | Reactive reads from the store, and viewer stats |
| `zod` | Parsing every API response (`src/types/api.ts`) |
| `@react-native-community/slider` | Loud alarm volume |
| `react-native-svg` | Mascot, avatars, rings |
| `react-native-reanimated` | Mascot animation |
| `jest-expo` | Tests |

## Known issues
- **Production API URL:** the `production` EAS profile sets no `EXPO_PUBLIC_API_BASE_URL`, unlike `preview`. Unless it's set in EAS, a production build falls back to `http://localhost:8080`.
- **Local port mismatch:** `.env.example` and the fallback in `src/config.ts` use port 8080, but the service defaults to 3000.
- **Old names:** database `bubu-bloom.db` and storage keys `bubu.*` keep an older project name. Renaming the storage names would lose local data. The Expo project slug is now `bloom-health-app`, the bundle id is `com.bloomhealthapp.app` and the scheme is `bloomhealth`; `bubu-bloom-service.vercel.app` stays up for older builds.
