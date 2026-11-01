# src/components/profile/

## Purpose
`ProfileHeader` shows a profile from `PublicProfile` (`lib/publicProfile.ts`). The Profile tab uses it today, and it's meant for other people's profiles once public user search exists.

## Rules
- Only `PublicProfile` data goes in this view. Email, phone, gender, the tracker switch and anything about periods are passed in as `children` by the Profile tab, only for your own profile, because gender and period data must never reach other users (`_shared/privacy-invariants.md`).
- It follows Instagram's arrangement on the app's glass `Card`. What differs between profiles goes in `children`: details and the Edit profile button for your own, which opens `edit-profile`, and something like Follow for others.

`ProfileCards` is a sideways row of cards on your own profile, each showing its information directly: achievements, today's habits, next milestone and a Discover placeholder. It reads private progress data and is hidden from viewers, whose data is the owner's. Don't show it on other people's profiles as it is. `ActivityGraph` is the permanent year graph above it, with the same rule. Achievements could be made public; today's habits and activity should stay private unless decided otherwise.

## Not built yet
Public search needs a server endpoint that returns only public fields, plus a decision on who is searchable. Add a `profile/[id]` route and a search tab then. Don't derive another person's profile from `User`.
