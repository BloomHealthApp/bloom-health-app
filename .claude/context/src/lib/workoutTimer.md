# Workout timer (`workoutTimer.ts`)

## Rules
Elapsed time is always computed from persisted timestamps. Don't hold it in `setInterval` state.

## Why
This way it survives backgrounding and process death.
