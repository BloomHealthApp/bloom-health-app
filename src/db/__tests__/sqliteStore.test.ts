import * as SQLite from 'expo-sqlite';
import { SqliteStore } from '../sqliteStore';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

const fakeDb = () => ({
  execAsync: jest.fn(async () => {}),
  getFirstAsync: jest.fn(async () => ({ user_version: 2 })),
  getAllAsync: jest.fn(async () => []),
  runAsync: jest.fn(async () => {}),
});
const open = SQLite.openDatabaseAsync as jest.Mock;

beforeEach(() => open.mockReset());

describe('SqliteStore startup', () => {
  it('lets a call made before init wait for the database', async () => {
    let finishOpen!: (db: unknown) => void;
    open.mockReturnValue(new Promise((resolve) => (finishOpen = resolve)));
    const db = fakeDb();
    const store = new SqliteStore();
    const ops = store.listOps();
    finishOpen(db);
    await expect(ops).resolves.toEqual([]);
    expect(db.getAllAsync).toHaveBeenCalledTimes(1);
  });

  it('opens once for concurrent and repeated callers', async () => {
    open.mockResolvedValue(fakeDb());
    const store = new SqliteStore();
    await Promise.all([store.init(), store.listOps(), store.getMeta('k')]);
    await store.init();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('reports a failed open and retries on the next call', async () => {
    open.mockRejectedValueOnce(new Error('disk')).mockResolvedValue(fakeDb());
    const store = new SqliteStore();
    await expect(store.listOps()).rejects.toThrow('disk');
    await expect(store.listOps()).resolves.toEqual([]);
  });
});
