# src/auth/

## Purpose
`tokenStore.ts` implements `TokenProvider`.

## Rules
Tokens live only in SecureStore (Keychain / Keystore) plus an in-memory cache. Never put them in AsyncStorage or SQLite.

## Gotchas
If SecureStore is unavailable, as on web, the memory cache still works, but only for that session.
