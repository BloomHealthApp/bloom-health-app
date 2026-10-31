# CLAUDE.md — bloom-health-app

Expo / React Native wellness tracker for an **owner**, who logs, and a read-only **viewer**. It's offline-first and talks to `bloom-health-service` using the contract in `docs/api-contract.md`.

@AGENTS.md

## Commands
```
npm run start:mock    # run without a backend (demo mode)
npm run typecheck     # tsc --noEmit
npm run lint          # eslint src
npm test              # jest
```

## Context workflow (every task)
Project context lives in `.claude/context/`, mirroring the app's folders. Not in code comments.

1. Before changing code in a folder, read the matching `.claude/context/<path>/context.md`, and its nearest parent if there is none. Also read the note for the file you're changing, if there is one, such as `src/sync/engine.md`.
2. After the change, in the same task, update the context file for any new or changed rule, reason, gotcha or architecture decision. Create the file if the folder now has real context. Delete statements that are no longer true.
3. New, moved or deleted folders: make the same change in `.claude/context/`. New or changed API calls: update the table in `src/api/context.md`. New or changed screens: update the table in `src/app/context.md`. New external services or changes to how one is used: update `_shared/external-services.md`.
4. Do not add comments to code to hold context, history or task notes.
   Allowed in code: doc comments that say more than the name; a short why-comment for non-obvious code; a brief warning where a privacy rule could be broken; lint directives.
5. Skip the update when nothing new was learned (e.g. a typo fix). Say in the final message which context files changed, or that none needed to.

## Where things are
Paths with context have a matching file at `.claude/context/<path>/context.md`. `.claude/context/_shared/` also has `offline-first.md`, `scoring-parity.md` and `external-services.md`.
```
src/app/            Expo Router screens
src/api/            ApiClient, every backend call; mock/ = demo server
src/types/          zod schemas mirroring the contract
src/sync/           sync engine and backoff
src/db/             Store interface, SQLite and memory stores
src/providers/      AuthProvider, DataProvider
src/features/       hooks joining the store, sync and pure logic
src/lib/            pure logic: scoring, cycle, dates, rules
src/components/     UI, mascot; periods/ = tracker UI
src/avatars/        profile avatars
src/notifications/  local reminders
src/theme/          themes
src/widgets/        Android home-screen widgets
src/auth/           token storage
```

## Invariants (always apply)
@.claude/context/_shared/privacy-invariants.md
