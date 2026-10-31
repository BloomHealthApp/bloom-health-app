# SyncEngine (`engine.ts`)

## Purpose
Queues local writes, pushes them, pulls changes, and tracks status for the chip and the Sync issues screen.

## Push results
| Result | What happens |
|---|---|
| `applied`, `duplicate` | Op deleted. Cache takes the server record, unless newer local edits are queued; then they stay visible and rebase on the server version |
| `conflict` | Server record replaces the cache, and the op shows under Sync issues |
| `rejected` | Op shows under Sync issues and is never retried |
| Missing from results | Retried with backoff |
| Whole request: network, 5xx, 429 | Retried with backoff, honoring `Retry-After`; `failed` after 8 attempts |
| Whole request: other 4xx | All ops in the batch marked `rejected` |

## Rules
- Period data never gets queued or cached for a non-owner.
- Only owners push. Everyone pulls.
- The cursor is saved in the same transaction as the page, only after the whole page is applied.
- Entities with un-pushed edits keep their local value during a pull.

## Why
- Consecutive un-sent upserts for an entity coalesce into one op with the same `operationId`, skipping ops in flight.
- An item created and deleted before ever syncing sends nothing.
- `sync()` is single-flight: concurrent callers share a run, and a request made mid-run triggers one more pass.

## Gotchas
- A network error during push skips the pull. Other push errors still pull.
- `discardOp` clears the cursor, so it causes a full re-pull.
- Batches are at most 100 ops, and pull stops after 100 pages per run.

## Related
`_shared/privacy-invariants.md`, `_shared/offline-first.md`
