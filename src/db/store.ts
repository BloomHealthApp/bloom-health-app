import type { EntityType, PushOperation } from '@/types/api';

export type OpStatus = 'pending' | 'failed' | 'conflict' | 'rejected';

export interface QueuedOp extends PushOperation {
  status: OpStatus;
  retryCount: number;
  /** epoch ms before which the op must not be retried */
  nextAttemptAt: number;
  lastError: string | null;
  /** monotonically increasing insertion order, assigned by the store */
  seq: number;
}

export type NewOp = Omit<QueuedOp, 'seq'>;

export interface Store {
  init(): Promise<void>;
  clearAll(): Promise<void>;

  getAll<T>(type: EntityType): Promise<T[]>;
  get<T>(type: EntityType, id: string): Promise<T | null>;
  put(type: EntityType, id: string, entity: unknown): Promise<void>;
  remove(type: EntityType, id: string): Promise<void>;

  /** Runs fn atomically; change notifications are coalesced to one at the end. */
  transaction<T>(fn: () => Promise<T>): Promise<T>;

  listOps(): Promise<QueuedOp[]>;
  insertOp(op: NewOp): Promise<void>;
  updateOp(operationId: string, patch: Partial<QueuedOp>): Promise<void>;
  deleteOp(operationId: string): Promise<void>;

  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string | null): Promise<void>;

  subscribe(cb: () => void): () => void;
}

export abstract class BaseStore {
  private listeners = new Set<() => void>();
  private depth = 0;
  private dirty = false;

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
  protected emit(): void {
    if (this.depth > 0) {
      this.dirty = true;
      return;
    }
    this.listeners.forEach((l) => l());
  }
  protected beginBatch(): void {
    this.depth++;
  }
  protected endBatch(): void {
    this.depth--;
    if (this.depth === 0 && this.dirty) {
      this.dirty = false;
      this.listeners.forEach((l) => l());
    }
  }
}
