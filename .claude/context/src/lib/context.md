# src/lib/

## Purpose
Pure logic with no React or React Native imports, so it's unit-testable under plain Jest.

| File | Purpose | Note |
|---|---|---|
| `scoring.ts` | Status, daily percent, streaks | [scoring.md](scoring.md) |
| `progress.ts` | Today's score and streaks from cached entities | [progress.md](progress.md) |
| `cycle.ts` | Cycle math | [cycle.md](cycle.md) |
| `workoutTimer.ts` | Timestamp-derived timer | [workoutTimer.md](workoutTimer.md) |
| `periodRules.ts` | Period validation | |
| `periodsView.ts` | Tracker view-model | |
| `profile.ts` | Gender and tracker rules | |
| `authForm.ts` | Auth validation and error copy | |
| `habitIcon.ts` | Icon rendering | |
| `dates.ts` | Timezone-aware dates | |
| `defaults.ts` | Default settings; seeded habits for mock mode | |

## Rules
- A `localDate` is `YYYY-MM-DD` in the user's IANA timezone.
- `periodRules.ts` is shared by the tracker screen, the offline write path and the mock server, so all three enforce the same contract.
- Always render habit icons through `habitGlyph()`. The service seeds slugs such as `sunrise` while custom habits use emoji, and a raw slug shows as clipped text.
