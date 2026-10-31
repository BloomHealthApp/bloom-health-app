# AuthProvider (`AuthProvider.tsx`)

## Purpose
Creates `ApiClient` (with `mockFetch` in demo mode), holds session state, and exposes sign-up, sign-in, verify and sign-out.

## Why
A cached user plus a stored token counts as signed in, so the app opens offline. The profile then refreshes in the background.

## Gotchas
- The user is cached in AsyncStorage, and tokens in SecureStore.
- `isOwner` is `user?.role === 'owner'`, from the server's response. It's for UI only; the server enforces roles.
- Email and identifier are lower-cased here before sending.
