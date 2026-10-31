# App context

Context for working on this app. It lives here so the code stays readable. The rules for reading and updating it are in the "Context workflow" section of `CLAUDE.md`.

- Paths mirror the app: `src/sync/` is described by `.claude/context/src/sync/context.md`.
- Only folders with real context get a file. If a folder has none, read its nearest parent.
- A folder's `context.md` can link to notes for individual files, named after the source file, such as `src/sync/engine.md` for `engine.ts`.
- `_shared/` holds rules that span many folders and has no equivalent in the app, including `external-services.md`.

## File template
Use these sections and leave out any that are empty. Record what the code can't show, and don't restate it.

```md
# <path>/

## Purpose
## Rules
## Why
## Gotchas
## Related
```
