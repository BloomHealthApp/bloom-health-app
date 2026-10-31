# Cycle math (`cycle.ts`)

## Rules
- A cycle is one start-to-start gap between two consecutive logged periods.
- Average cycle length uses up to the last 6 gaps. Average period length uses the last 6 finished periods.
- The next-start estimate needs at least 2 cycles (3 logged periods). Otherwise there is no estimate.
- The predicted window is the estimate plus or minus `PREDICTION_WINDOW_DAYS`.
- Estimates only, never medical advice.

## Gotchas
`periodNeutralDates` returns nothing unless the owner's tracker is on. Viewers never call it.

## Related
`_shared/privacy-invariants.md`
