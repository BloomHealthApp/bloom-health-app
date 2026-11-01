# src/components/profile/

## Purpose
`ProfileHeader` shows a profile from `PublicProfile` (`lib/publicProfile.ts`). The Profile tab uses it today, and it's meant for other people's profiles once public user search exists.

## Rules
- Only `PublicProfile` data goes in this view. Email, phone, gender, the tracker switch and anything about periods stay in the Profile tab's "Only you can see this" section, because gender and period data must never reach other users (`_shared/privacy-invariants.md`).
- What differs between profiles goes in `actions`: Edit profile for your own, and something like Follow for others.

## Not built yet
Public search needs a server endpoint that returns only public fields, plus a decision on who is searchable. Add a `profile/[id]` route and a search tab then. Don't derive another person's profile from `User`.
