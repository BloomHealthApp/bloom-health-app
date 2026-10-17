import type { EntityType } from '@/types/api';
import { BaseStore, type NewOp, type QueuedOp, type Store } from './store';

/** In-memory Store. Used by unit tests (sync engine) and handy for storybook-style demos. */
export class MemoryStore extends BaseStore implements Store {
  private entities = new Map<string, unknown>();
  private ops: QueuedOp[] = [];
  private meta = new Map<string, string>();
  private seq = 0;

  async init() {}
  async clearAll() {
    this.entities.clear();
    this.ops = [];
    this.meta.clear();
    this.emit();
  }
  private k(type: EntityType, id: string) {
    return `${type}\u0000${id}`;
  }
  async getAll<T>(type: EntityType): Promise<T[]> {
    const prefix = `${type}\u0000`;
    const out: T[] = [];
    for (const [k, v] of this.entities) if (k.startsWith(prefix)) out.push(structuredClone(v) as T);
    return out;
  }
  async get<T>(type: EntityType, id: string): Promise<T | null> {
    const v = this.entities.get(this.k(type, id));
    return v === undefined ? null : (structuredClone(v) as T);
  }
  async put(type: EntityType, id: string, entity: unknown) {
    this.entities.set(this.k(type, id), structuredClone(entity));
    this.emit();
  }
  async remove(type: EntityType, id: string) {
    this.entities.delete(this.k(type, id));
    this.emit();
  }
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    this.beginBatch();
    try {
      return await fn();
    } finally {
      this.endBatch();
    }
  }
  async listOps() {
    return this.ops.map((o) => structuredClone(o));
  }
  async insertOp(op: NewOp) {
    this.ops.push({ ...structuredClone(op), seq: ++this.seq });
    this.emit();
  }
  async updateOp(id: string, patch: Partial<QueuedOp>) {
    const i = this.ops.findIndex((o) => o.operationId === id);
    if (i >= 0) this.ops[i] = { ...this.ops[i], ...structuredClone(patch) };
    this.emit();
  }
  async deleteOp(id: string) {
    this.ops = this.ops.filter((o) => o.operationId !== id);
    this.emit();
  }
  async getMeta(key: string) {
    return this.meta.get(key) ?? null;
  }
  async setMeta(key: string, value: string | null) {
    if (value === null) this.meta.delete(key);
    else this.meta.set(key, value);
  }
}
