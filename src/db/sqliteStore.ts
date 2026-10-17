import * as SQLite from 'expo-sqlite';
import type { EntityType } from '@/types/api';
import { BaseStore, type NewOp, type QueuedOp, type Store } from './store';

const SCHEMA_VERSION = 2;

/** Period entities live in their own table (private owner data, indexed by start date); everything else is in `entities`. */
const isPeriod = (type: EntityType) => type === 'period';

/** SQLite-backed cache + sync queue. Entities are stored as JSON blobs keyed by (type,id). */
export class SqliteStore extends BaseStore implements Store {
  private db!: SQLite.SQLiteDatabase;
  private txChain: Promise<unknown> = Promise.resolve();

  constructor(private name = 'bubu-bloom.db') {
    super();
  }

  async init() {
    this.db = await SQLite.openDatabaseAsync(this.name);
    await this.db.execAsync('PRAGMA journal_mode = WAL;');
    const row = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const v = row?.user_version ?? 0;
    if (v < 1) {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS entities (
          type TEXT NOT NULL, id TEXT NOT NULL, json TEXT NOT NULL,
          PRIMARY KEY (type, id)
        );
        CREATE TABLE IF NOT EXISTS sync_ops (
          seq INTEGER PRIMARY KEY AUTOINCREMENT,
          operationId TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL,
          json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_ops_status ON sync_ops(status, seq);
        CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
      `);
    }
    if (v < 2) {
      // v2: private period tracker rows (owner only)
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS periods (
          id TEXT PRIMARY KEY, start_date TEXT NOT NULL, json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_periods_start ON periods(start_date);
      `);
    }
    if (v < SCHEMA_VERSION) await this.db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }

  async clearAll() {
    await this.db.execAsync('DELETE FROM entities; DELETE FROM periods; DELETE FROM sync_ops; DELETE FROM meta;');
    this.emit();
  }

  async getAll<T>(type: EntityType): Promise<T[]> {
    if (isPeriod(type)) {
      const rows = await this.db.getAllAsync<{ json: string }>('SELECT json FROM periods ORDER BY start_date ASC');
      return rows.map((r) => JSON.parse(r.json) as T);
    }
    const rows = await this.db.getAllAsync<{ json: string }>('SELECT json FROM entities WHERE type = ?', type);
    return rows.map((r) => JSON.parse(r.json) as T);
  }
  async get<T>(type: EntityType, id: string): Promise<T | null> {
    if (isPeriod(type)) {
      const r = await this.db.getFirstAsync<{ json: string }>('SELECT json FROM periods WHERE id = ?', id);
      return r ? (JSON.parse(r.json) as T) : null;
    }
    const r = await this.db.getFirstAsync<{ json: string }>('SELECT json FROM entities WHERE type = ? AND id = ?', type, id);
    return r ? (JSON.parse(r.json) as T) : null;
  }
  async put(type: EntityType, id: string, entity: unknown) {
    if (isPeriod(type)) {
      const startDate = (entity as { startDate?: string }).startDate ?? '';
      await this.db.runAsync('INSERT OR REPLACE INTO periods (id, start_date, json) VALUES (?, ?, ?)', id, startDate, JSON.stringify(entity));
      this.emit();
      return;
    }
    await this.db.runAsync('INSERT OR REPLACE INTO entities (type, id, json) VALUES (?, ?, ?)', type, id, JSON.stringify(entity));
    this.emit();
  }
  async remove(type: EntityType, id: string) {
    if (isPeriod(type)) {
      await this.db.runAsync('DELETE FROM periods WHERE id = ?', id);
      this.emit();
      return;
    }
    await this.db.runAsync('DELETE FROM entities WHERE type = ? AND id = ?', type, id);
    this.emit();
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    // Serialise transactions; SQLite does not support nested/concurrent ones on one connection.
    const run = async () => {
      this.beginBatch();
      try {
        let result!: T;
        await this.db.withTransactionAsync(async () => {
          result = await fn();
        });
        return result;
      } finally {
        this.endBatch();
      }
    };
    const p = this.txChain.then(run, run);
    this.txChain = p.catch(() => undefined);
    return p;
  }

  async listOps(): Promise<QueuedOp[]> {
    const rows = await this.db.getAllAsync<{ seq: number; json: string }>('SELECT seq, json FROM sync_ops ORDER BY seq ASC');
    return rows.map((r) => ({ ...(JSON.parse(r.json) as QueuedOp), seq: r.seq }));
  }
  async insertOp(op: NewOp) {
    await this.db.runAsync('INSERT INTO sync_ops (operationId, status, json) VALUES (?, ?, ?)', op.operationId, op.status, JSON.stringify(op));
    this.emit();
  }
  async updateOp(operationId: string, patch: Partial<QueuedOp>) {
    const r = await this.db.getFirstAsync<{ json: string }>('SELECT json FROM sync_ops WHERE operationId = ?', operationId);
    if (!r) return;
    const next = { ...(JSON.parse(r.json) as QueuedOp), ...patch };
    await this.db.runAsync('UPDATE sync_ops SET status = ?, json = ? WHERE operationId = ?', next.status, JSON.stringify(next), operationId);
    this.emit();
  }
  async deleteOp(operationId: string) {
    await this.db.runAsync('DELETE FROM sync_ops WHERE operationId = ?', operationId);
    this.emit();
  }

  async getMeta(key: string) {
    const r = await this.db.getFirstAsync<{ value: string | null }>('SELECT value FROM meta WHERE key = ?', key);
    return r?.value ?? null;
  }
  async setMeta(key: string, value: string | null) {
    if (value === null) await this.db.runAsync('DELETE FROM meta WHERE key = ?', key);
    else await this.db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, value);
  }
}
