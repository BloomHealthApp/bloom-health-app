# Scoring parity with the service

## Rules
- `src/lib/scoring.ts` and the service's `pkg/utils/scoring` must give the same results. A rule change needs both updated.
- Shared fixtures: `bloom-health-service/testdata/scoring.json`, copied to `src/lib/__fixtures__/scoring.json`. `src/lib/__tests__/serviceFixtures.test.ts` runs them. Update both copies together.
- The scoring library has no React or React Native imports, so it runs under plain Jest.
- It doesn't know why a date is neutral. Callers build `neutralDates` and the effective rest days.

## Why
Owners score locally so the app works offline. Viewers can't, because they have no period data, so their numbers come from the server.
