# Scoring (`scoring.ts`)

## Rules
See `_shared/scoring-parity.md`. The status rules are documented on the function in the code.

## Why
- The upper bound of `between` is a recommendation, so exceeding it is never penalised.
- `partial` scores 0 in the daily percent and shows as "in progress".
- Today being unfinished never breaks a streak: the current streak counts from yesterday.
- With `restDayMode: counts`, a rest day counts as a success. With `neutral`, an unsuccessful rest day neither breaks nor extends a streak, and logging enough habits makes it a normal success.

## Gotchas
Sunday is a rest day unless `sundayRest` is explicitly false; absent means on, for older servers and accounts.
