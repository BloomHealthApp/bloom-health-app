# src/app/

## Purpose
Expo Router routes. Every file is a screen and `_layout.tsx` files define navigators. Non-route code belongs outside this folder.

## All screens
| Route file | Access | Purpose |
|---|---|---|
| `_layout.tsx` | all | Fonts, providers. Mounts `DataProvider` only when signed in |
| `index.tsx` | all | Redirects to tabs or welcome |
| `(auth)/_layout.tsx` | signed out | Redirects to tabs when signed in; always starts at welcome |
| `(auth)/welcome.tsx` | signed out | Start screen |
| `(auth)/signup.tsx` | signed out | Sign-up form |
| `(auth)/signin.tsx` | signed out | Sign in with email or phone |
| `(auth)/otp.tsx` | signed out | Enter code; redirects to welcome with no `challengeId` |
| `(tabs)/_layout.tsx` | signed in | Tab bar; redirects to choose-avatar once after first sign-up |
| `(tabs)/index.tsx` | signed in | Home; viewers poll every 30 seconds while focused |
| `(tabs)/progress.tsx` | signed in | Charts |
| `(tabs)/calendar.tsx` | signed in | Month view |
| `(tabs)/settings.tsx` | signed in | Profile, settings, reminders, sign out |
| `choose-avatar.tsx` | signed in | One-time, skippable avatar choice |
| `day/[date].tsx` | signed in | One day's habits; read-only list |
| `habit/[id].tsx` | signed in | Log a value; read-only for viewers and future dates |
| `habit/form.tsx` | owner | Create or edit a habit |
| `habits.tsx` | signed in | Habit list; edit controls for owners only |
| `workout.tsx` | signed in | Timer and history; controls for owners only |
| `periods.tsx` | owner, tracker on | Private tracker; anyone else is redirected |
| `sync-issues.tsx` | signed in | Failed, conflicted and rejected sync operations |

## Rules
- Viewers must always see a read-only UI. The server enforces this too, and `useActions` throws `ReadOnlyError`.
- Keep routes thin; logic belongs in `features/`, `lib/` or a component.

## Why
- The data layer only exists for a signed-in user, so `SyncEngine` and SQLite don't run on auth screens.
- Signing in swaps the root tree, and the layouts' redirects then move to the tabs. So `otp.tsx` doesn't navigate after success.
- A resend returns a new `challengeId`, which replaces the one from the route params.
