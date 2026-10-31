import type { ApiClient } from '@/api/client';
import { ApiError, isNetworkError, isRetryable } from '@/api/errors';
import type { QueuedOp, Store } from '@/db/store';
import { uuid } from '@/lib/ids';
import type { EntityType, PushOperation, PushResult, Role } from '@/types/api';
import { MAX_ATTEMPTS, backoffMs } from './backoff';

export type SyncApi = Pick<ApiClient, 'syncPush' | 'syncPull'>;

export type SyncState = 'synced' | 'pending' | 'failed' | 'offline' | 'syncing';
export interface SyncStatus {
  state: SyncState;
  pending: number;
  failed: number;
  lastSyncedAt: number | null;
  lastError: string | null;
}

export interface EngineOptions {
  deviceId: string;
  getRole: () => Role | null;
  now?: () => number;
  random?: () => number;
  maxBatch?: number;
}

export const CURSOR_KEY = 'syncCursor';
const keyOf = (t: EntityType, id: string) => `${t}:${id}`;

export class SyncEngine {
  private listeners = new Set<(s: SyncStatus) => void>();
  private inFlight = new Set<string>();
  private running: Promise<void> | null = null;
  private rerun = false;
  private offline = false;
  private lastSyncedAt: number | null = null;
  private lastError: string | null = null;
  private status: SyncStatus = { state: 'synced', pending: 0, failed: 0, lastSyncedAt: null, lastError: null };
  private now: () => number;
  private random: () => number;
  private maxBatch: number;

  constructor(
    private store: Store,
    private api: SyncApi,
    private opts: EngineOptions,
  ) {
    this.now = opts.now ?? Date.now;
    this.random = opts.random ?? Math.random;
    this.maxBatch = Math.min(100, opts.maxBatch ?? 100);
  }

  setDeviceId(id: string) {
    this.opts.deviceId = id;
  }

  getStatus(): SyncStatus {
    return this.status;
  }
  subscribe(cb: (s: SyncStatus) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
  setOffline(offline: boolean) {
    this.offline = offline;
    void this.refreshStatus();
  }
  async refreshStatus(syncing = false): Promise<SyncStatus> {
    const ops = await this.store.listOps();
    const pending = ops.filter((o) => o.status === 'pending').length;
    const failed = ops.length - pending;
    let state: SyncState = 'synced';
    if (syncing) state = 'syncing';
    else if (this.offline) state = 'offline';
    else if (failed > 0) state = 'failed';
    else if (pending > 0) state = 'pending';
    this.status = { state, pending, failed, lastSyncedAt: this.lastSyncedAt, lastError: this.lastError };
    this.listeners.forEach((l) => l(this.status));
    return this.status;
  }

  /**
   * Optimistically writes `entity` (null for deletes of never-synced items) to the cache and queues an operation.
   * Consecutive un-sent upserts for the same entity are coalesced into one operation (same operationId).
   */
  async mutate(args: {
    entityType: EntityType;
    entityId: string;
    op: 'upsert' | 'delete';
    payload: Record<string, unknown>;
    /** The optimistic entity to store locally (already containing the new values). */
    entity: Record<string, unknown>;
  }): Promise<void> {
    const { entityType, entityId, op, payload, entity } = args;
    // Period data is private to the owner: never queue or cache it for anyone else.
    if (entityType === 'period' && this.opts.getRole() !== 'owner') throw new Error('Period data is only available to the owner.');
    await this.store.transaction(async () => {
      const existing = await this.store.get<{ version?: number }>(entityType, entityId);
      const baseVersion = existing?.version ?? 0;
      const ops = await this.store.listOps();
      const prior = ops.find(
        (o) => o.entityType === entityType && o.entityId === entityId && o.status === 'pending' && !this.inFlight.has(o.operationId),
      );
      const ts = new Date(this.now()).toISOString();

      if (prior) {
        if (op === 'delete' && prior.op === 'upsert' && prior.baseVersion === 0) {
          // created and deleted before ever syncing: nothing to send.
          await this.store.deleteOp(prior.operationId);
          await this.store.remove(entityType, entityId);
          return;
        }
        await this.store.updateOp(prior.operationId, { op, payload, clientTimestamp: ts, retryCount: 0, nextAttemptAt: 0, lastError: null });
      } else {
        await this.store.insertOp({
          operationId: uuid(),
          entityType,
          entityId,
          op,
          baseVersion,
          payload,
          clientTimestamp: ts,
          status: 'pending',
          retryCount: 0,
          nextAttemptAt: 0,
          lastError: null,
        });
      }
      await this.store.put(entityType, entityId, entity);
    });
    await this.refreshStatus();
  }

  /** Single-flight: concurrent callers share one run; a request made mid-run triggers one more pass. */
  sync(): Promise<void> {
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.rerun = false;
          await this.runOnce();
        } while (this.rerun);
      } finally {
        this.running = null;
        await this.refreshStatus();
      }
    })();
    return this.running;
  }

  private async runOnce(): Promise<void> {
    await this.refreshStatus(true);
    try {
      if (this.opts.getRole() === 'owner') {
        try {
          await this.push();
        } catch (e) {
          if (isNetworkError(e)) throw e; // offline: skip pull too
          this.lastError = e instanceof Error ? e.message : String(e); // 4xx/5xx already recorded per-op; still pull
        }
      }
      await this.pull();
      this.offline = false;
      this.lastError = null;
      this.lastSyncedAt = this.now();
    } catch (e) {
      if (isNetworkError(e)) this.offline = true;
      this.lastError = e instanceof Error ? e.message : String(e);
    }
  }

  async push(): Promise<void> {
    const now = this.now();
    const ops = (await this.store.listOps()).filter((o) => o.status === 'pending' && o.nextAttemptAt <= now).slice(0, this.maxBatch);
    if (ops.length === 0) return;
    ops.forEach((o) => this.inFlight.add(o.operationId));
    try {
      const wire: PushOperation[] = ops.map((o) => ({
        operationId: o.operationId,
        entityType: o.entityType,
        entityId: o.entityId,
        op: o.op,
        baseVersion: o.baseVersion,
        payload: o.payload,
        clientTimestamp: o.clientTimestamp,
      }));
      let results: PushResult[];
      try {
        results = await this.api.syncPush(this.opts.deviceId, wire);
      } catch (e) {
        await this.handlePushFailure(ops, e);
        throw e;
      }
      this.offline = false;
      const byId = new Map(results.map((r) => [r.operationId, r]));
      for (const op of ops) {
        const r = byId.get(op.operationId);
        if (!r) await this.scheduleRetry(op, 'missing_result');
        else await this.applyResult(op, r);
      }
    } finally {
      ops.forEach((o) => this.inFlight.delete(o.operationId));
    }
  }

  private async handlePushFailure(ops: QueuedOp[], e: unknown) {
    if (isRetryable(e)) {
      const retryAfter = e instanceof ApiError ? e.retryAfterSeconds : undefined;
      for (const op of ops) await this.scheduleRetry(op, e instanceof Error ? e.message : 'error', retryAfter);
      return;
    }
    // 4xx for the whole request: not retryable (403 viewer, 400 validation). Never retried automatically.
    const reason = e instanceof ApiError ? e.code : 'error';
    for (const op of ops) await this.store.updateOp(op.operationId, { status: 'rejected', lastError: reason });
  }

  private async scheduleRetry(op: QueuedOp, error: string, retryAfterSeconds?: number) {
    const retryCount = op.retryCount + 1;
    if (retryCount >= MAX_ATTEMPTS) {
      await this.store.updateOp(op.operationId, { status: 'failed', retryCount, lastError: error });
      return;
    }
    const delay = retryAfterSeconds ? retryAfterSeconds * 1000 : backoffMs(retryCount, this.random);
    await this.store.updateOp(op.operationId, { retryCount, nextAttemptAt: this.now() + delay, lastError: error });
  }

  private async applyResult(op: QueuedOp, r: PushResult) {
    await this.store.transaction(async () => {
      if (r.status === 'applied' || r.status === 'duplicate') {
        const server = (r.entity ?? null) as { id?: string; version?: number } | null;
        await this.store.deleteOp(op.operationId);
        const siblings = (await this.store.listOps()).filter(
          (o) => o.entityType === op.entityType && o.entityId === op.entityId && o.status === 'pending',
        );
        if (server) {
          if (siblings.length > 0) {
            // newer local edits are still queued: keep them visible, but rebase on the server version
            for (const s of siblings) await this.store.updateOp(s.operationId, { baseVersion: server.version ?? s.baseVersion });
            const local = await this.store.get<Record<string, unknown>>(op.entityType, op.entityId);
            if (local) await this.store.put(op.entityType, op.entityId, { ...local, version: server.version });
          } else {
            await this.store.put(op.entityType, op.entityId, server);
          }
        }
      } else if (r.status === 'conflict') {
        if (r.entity) await this.store.put(op.entityType, op.entityId, r.entity); // server record wins
        await this.store.updateOp(op.operationId, { status: 'conflict', lastError: r.reason ?? 'conflict' });
      } else {
        await this.store.updateOp(op.operationId, { status: 'rejected', lastError: r.reason ?? 'rejected' });
      }
    });
  }

  async pull(): Promise<void> {
    let cursor = (await this.store.getMeta(CURSOR_KEY)) ?? '';
    for (let page = 0; page < 100; page++) {
      const res = await this.api.syncPull(cursor, 500);
      await this.store.transaction(async () => {
        // Entities with un-pushed local edits keep their local value until the push settles.
        const dirty = new Set((await this.store.listOps()).filter((o) => o.status === 'pending').map((o) => keyOf(o.entityType, o.entityId)));
        const put = async (t: EntityType, list: { id: string }[]) => {
          for (const e of list) if (!dirty.has(keyOf(t, e.id))) await this.store.put(t, e.id, e);
        };
        await put('habit', res.changes.habits);
        await put('dailyLog', res.changes.dailyLogs);
        await put('workout', res.changes.workouts);
        await put('settings', res.changes.settings);
        if (this.opts.getRole() === 'owner') {
          await put('period', res.changes.periods);
        } else {
          // Viewers never receive periods; drop anything cached (e.g. from an earlier role) and ignore the field.
          for (const p of await this.store.getAll<{ id: string }>('period')) await this.store.remove('period', p.id);
        }
        // cursor persisted only after the whole page has been applied (same transaction)
        await this.store.setMeta(CURSOR_KEY, res.cursor);
      });
      cursor = res.cursor;
      if (!res.hasMore) break;
    }
  }

  /** Make `failed` (retry-exhausted) ops pending again. Rejected/conflict ops are not retryable. */
  async retryFailed(): Promise<void> {
    for (const op of await this.store.listOps()) {
      if (op.status === 'failed') await this.store.updateOp(op.operationId, { status: 'pending', retryCount: 0, nextAttemptAt: 0 });
    }
    await this.sync();
  }

  async listIssues(): Promise<QueuedOp[]> {
    return (await this.store.listOps()).filter((o) => o.status !== 'pending');
  }

  /** Dismiss an issue and reconcile the entity with the server (full re-pull). */
  async discardOp(operationId: string): Promise<void> {
    const op = (await this.store.listOps()).find((o) => o.operationId === operationId);
    if (!op) return;
    await this.store.deleteOp(operationId);
    const local = await this.store.get<{ version?: number }>(op.entityType, op.entityId);
    if (local && (local.version ?? 0) === 0) await this.store.remove(op.entityType, op.entityId);
    await this.store.setMeta(CURSOR_KEY, null);
    await this.sync();
  }

  /** Earliest time at which a backed-off op becomes due (ms epoch) or null. */
  async nextDueAt(): Promise<number | null> {
    const due = (await this.store.listOps()).filter((o) => o.status === 'pending').map((o) => o.nextAttemptAt);
    return due.length ? Math.min(...due) : null;
  }
}
