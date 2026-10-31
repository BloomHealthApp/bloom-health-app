# src/types/

## Purpose
`api.ts` holds types and zod schemas mirroring `docs/api-contract.md`. Keep it in sync with the contract.

## Why
Schemas tolerate older and newer servers on purpose:

- New fields can be absent on older servers.
- Unknown symptoms from a newer server are dropped on read, so they don't fail a whole sync page.

Keep this tolerance when adding fields, because installed apps outlive a server release.
