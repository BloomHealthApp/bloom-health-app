import { ApiClient, type TokenState } from '@/api/client';
import { ApiError, NetworkError } from '@/api/errors';
import { mockFetch, resetMockServer, MOCK_OTP } from '@/api/mock/mockServer';
import { MemoryStore } from '@/db/memoryStore';
import { localDateInTz } from '@/lib/dates';
import type { DailyLog, Habit, PullResponse, PushOperation, PushResult, Role } from '@/types/api';
import { BACKOFF_MAX_MS, MAX_ATTEMPTS, backoffMs } from '../backoff';
import { CURSOR_KEY, SyncEngine, type SyncApi } from '../engine';

const TODAY = localDateInTz(new Date(), 'Asia/Kolkata');

async function login(email: string) {
  let tokens: TokenState | null = null;
  const client = new ApiClient('http://mock', mockFetch, {
    get: async () => tokens ?? { accessToken: null, refreshToken: null, expiresAt: null },
    set: async (t) => {
      tokens = t;
    },
    onAuthLost: () => {},
  });
  const { challengeId } = await client.requestSignIn(email);
  const user = await client.verifyOtp(challengeId, MOCK_OTP);
  return { client, user };
}

function engineFor(api: SyncApi, role: Role = 'owner', now = () => Date.now()) {
  const store = new MemoryStore();
  const engine = new SyncEngine(store, api, { deviceId: 'dev-1', getRole: () => role, now, random: () => 0.5 });
  return { store, engine };
}

const logPayload = (value: number) => ({ value, status: 'complete', note: null });
const logEntity = (habitId: string, date: string, value: number, version = 0) => ({
  id: `${habitId}:${date}`,
  habitId,
  localDate: date,
  value,
  status: 'complete',
  note: null,
  version,
  updatedAt: new Date().toISOString(),
  deletedAt: null,
});

beforeEach(() => resetMockServer());

describe('backoff', () => {
  it('grows exponentially from ~2s and caps at 5 minutes', () => {
    expect(backoffMs(1, () => 0.5)).toBe(2000);
    expect(backoffMs(2, () => 0.5)).toBe(4000);
    expect(backoffMs(20, () => 0.5)).toBe(BACKOFF_MAX_MS);
    expect(backoffMs(20, () => 1)).toBeLessThanOrEqual(BACKOFF_MAX_MS);
    expect(backoffMs(3, () => 0)).toBeLessThan(backoffMs(3, () => 1));
  });
});

describe('local queue', () => {
  const noApi: SyncApi = { syncPush: jest.fn(), syncPull: jest.fn() };
  it('coalesces un-sent upserts for the same entity into one operation', async () => {
    const { store, engine } = engineFor(noApi);
    const id = `default-water:${TODAY}`;
    await engine.mutate({ entityType: 'dailyLog', entityId: id, op: 'upsert', payload: logPayload(250), entity: logEntity('default-water', TODAY, 250) });
    await engine.mutate({ entityType: 'dailyLog', entityId: id, op: 'upsert', payload: logPayload(750), entity: logEntity('default-water', TODAY, 750) });
    const ops = await store.listOps();
    expect(ops).toHaveLength(1);
    expect(ops[0].payload).toEqual(logPayload(750));
    expect(engine.getStatus()).toMatchObject({ state: 'pending', pending: 1 });
  });
  it('create then delete before sync cancels out', async () => {
    const { store, engine } = engineFor(noApi);
    await engine.mutate({ entityType: 'habit', entityId: 'h-new', op: 'upsert', payload: { title: 'x' }, entity: { id: 'h-new', version: 0 } });
    await engine.mutate({ entityType: 'habit', entityId: 'h-new', op: 'delete', payload: {}, entity: { id: 'h-new', version: 0 } });
    expect(await store.listOps()).toHaveLength(0);
    expect(await store.get('habit', 'h-new')).toBeNull();
  });
});

describe('against the mock service', () => {
  it('owner: push applies, assigns server version, pull brings server data, cursor persisted', async () => {
    const { client } = await login('anu@example.com');
    const { store, engine } = engineFor(client);
    await engine.sync(); // initial pull
    const habits = await store.getAll<Habit>('habit');
    expect(habits).toHaveLength(8);
    expect(await store.getMeta(CURSOR_KEY)).not.toBeNull();

    const id = `default-water:${TODAY}`;
    await engine.mutate({ entityType: 'dailyLog', entityId: id, op: 'upsert', payload: logPayload(500), entity: logEntity('default-water', TODAY, 500) });
    await engine.sync();
    expect(await store.listOps()).toHaveLength(0);
    const saved = await store.get<DailyLog>('dailyLog', id);
    expect(saved?.version).toBe(1);
    expect(saved?.value).toBe(500);
    expect(engine.getStatus().state).toBe('synced');
  });

  it('viewer: never pushes, but can pull (and server would 403 a push)', async () => {
    const { client } = await login('aman@example.com');
    const spy = jest.spyOn(client, 'syncPush');
    const { store, engine } = engineFor(client, 'viewer');
    await engine.sync();
    expect(spy).not.toHaveBeenCalled();
    expect((await store.getAll('habit')).length).toBe(8);
    await expect(client.syncPush('d', [])).rejects.toMatchObject({ status: 403, code: 'forbidden' });
  });

  it('is idempotent by operationId (duplicate returns stored result)', async () => {
    const { client } = await login('anu@example.com');
    const op: PushOperation = {
      operationId: 'op-1',
      entityType: 'dailyLog',
      entityId: `default-no-sugar:${TODAY}`,
      op: 'upsert',
      baseVersion: 0,
      payload: { value: 1, status: 'complete', note: null },
      clientTimestamp: new Date().toISOString(),
    };
    const first = await client.syncPush('dev', [op]);
    const second = await client.syncPush('dev', [op]);
    expect(first[0].status).toBe('applied');
    expect(second[0].status).toBe('duplicate');
    expect(second[0].entity).toEqual(first[0].entity);
  });

  it('stale baseVersion on a habit => conflict, server record replaces the cache', async () => {
    const { client } = await login('anu@example.com');
    const { store, engine } = engineFor(client);
    await engine.sync();
    const h = (await store.get<Habit>('habit', 'default-steps'))!;
    // another device bumps the habit on the server
    await client.syncPush('other', [
      { operationId: 'o-other', entityType: 'habit', entityId: h.id, op: 'upsert', baseVersion: h.version, payload: { title: 'Steps (server)' }, clientTimestamp: new Date().toISOString() },
    ]);
    await engine.mutate({ entityType: 'habit', entityId: h.id, op: 'upsert', payload: { title: 'Steps (mine)' }, entity: { ...h, title: 'Steps (mine)' } });
    await engine.sync();
    const after = await store.get<Habit>('habit', h.id);
    expect(after?.title).toBe('Steps (server)');
    const issues = await engine.listIssues();
    expect(issues).toHaveLength(1);
    expect(issues[0].status).toBe('conflict');
    expect(engine.getStatus().state).toBe('failed');
  });

  it('dailyLog conflict with a newer clientTimestamp resolves last-writer-wins', async () => {
    const { client } = await login('anu@example.com');
    const { store, engine } = engineFor(client);
    await engine.sync();
    const id = `default-water:${TODAY}`;
    await client.syncPush('other', [
      { operationId: 'o1', entityType: 'dailyLog', entityId: id, op: 'upsert', baseVersion: 0, payload: logPayload(300), clientTimestamp: new Date().toISOString() },
    ]);
    await new Promise((r) => setTimeout(r, 5));
    await engine.mutate({ entityType: 'dailyLog', entityId: id, op: 'upsert', payload: logPayload(900), entity: logEntity('default-water', TODAY, 900, 0) });
    await engine.sync();
    const saved = await store.get<DailyLog>('dailyLog', id);
    expect(saved?.value).toBe(900);
    expect(saved?.version).toBe(2);
    expect(await store.listOps()).toHaveLength(0);
  });

  it('rejected ops (future date) are never retried and surface as issues', async () => {
    const { client } = await login('anu@example.com');
    const { store, engine } = engineFor(client);
    const spy = jest.spyOn(client, 'syncPush');
    const future = '2099-01-01';
    await engine.mutate({ entityType: 'dailyLog', entityId: `default-water:${future}`, op: 'upsert', payload: logPayload(1), entity: logEntity('default-water', future, 1) });
    await engine.sync();
    await engine.sync();
    expect(spy).toHaveBeenCalledTimes(1);
    const ops = await store.listOps();
    expect(ops[0].status).toBe('rejected');
  });

  it('pull does not clobber entities that still have un-pushed local edits', async () => {
    const { client } = await login('anu@example.com');
    const { store, engine } = engineFor(client);
    await engine.sync();
    const h = (await store.get<Habit>('habit', 'default-water'))!;
    const offlineClient = { syncPush: async () => { throw new NetworkError(); }, syncPull: client.syncPull.bind(client) } as SyncApi;
    const eng2 = new SyncEngine(store, offlineClient, { deviceId: 'd', getRole: () => 'owner' });
    await eng2.mutate({ entityType: 'habit', entityId: h.id, op: 'upsert', payload: { title: 'Local title' }, entity: { ...h, title: 'Local title' } });
    await client.syncPush('other', [
      { operationId: 'o-x', entityType: 'habit', entityId: h.id, op: 'upsert', baseVersion: h.version, payload: { title: 'Remote title' }, clientTimestamp: new Date().toISOString() },
    ]);
    await eng2.pull();
    expect((await store.get<Habit>('habit', h.id))?.title).toBe('Local title');
  });
});

describe('retry behaviour (scripted api)', () => {
  const scripted = (push: () => Promise<PushResult[]>): SyncApi => ({
    syncPush: async () => push(),
    syncPull: async (): Promise<PullResponse> => ({ cursor: '0', hasMore: false, changes: { habits: [], dailyLogs: [], workouts: [], settings: [] } }),
  });

  it('network failure schedules exponential backoff, marks offline, then fails after 8 attempts; manual retry resets', async () => {
    let t = 1_000_000;
    const { store, engine } = engineFor(scripted(async () => { throw new NetworkError(); }), 'owner', () => t);
    await engine.mutate({ entityType: 'dailyLog', entityId: `h:${TODAY}`, op: 'upsert', payload: logPayload(1), entity: logEntity('h', TODAY, 1) });
    await engine.sync();
    let op = (await store.listOps())[0];
    expect(op.retryCount).toBe(1);
    expect(op.nextAttemptAt).toBe(t + 2000);
    expect(engine.getStatus().state).toBe('offline');

    // not due yet => not attempted
    await engine.sync();
    op = (await store.listOps())[0];
    expect(op.retryCount).toBe(1);

    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      t = op.nextAttemptAt + 1;
      await engine.sync();
      op = (await store.listOps())[0];
    }
    expect(op.status).toBe('failed');
    expect(op.retryCount).toBe(MAX_ATTEMPTS);

    await store.updateOp(op.operationId, {}); // no-op
    await engine.retryFailed();
    op = (await store.listOps())[0];
    expect(op.retryCount).toBe(1); // retried once, failed again, but counter was reset first
    expect(op.status).toBe('pending');
  });

  it('5xx and 429 are retryable; 400 is not', async () => {
    let call = 0;
    const api = scripted(async () => {
      call++;
      if (call === 1) throw new ApiError(503, 'internal', 'down');
      if (call === 2) throw new ApiError(429, 'rate_limited', 'slow', undefined, 30);
      throw new ApiError(400, 'validation_failed', 'bad');
    });
    let t = 0;
    const { store, engine } = engineFor(api, 'owner', () => t);
    await engine.mutate({ entityType: 'workout', entityId: 'w1', op: 'upsert', payload: { type: 'yoga' }, entity: { id: 'w1', version: 0 } });
    await engine.sync();
    expect((await store.listOps())[0].status).toBe('pending');
    t = (await store.listOps())[0].nextAttemptAt + 1;
    await engine.sync();
    const afterRate = (await store.listOps())[0];
    expect(afterRate.nextAttemptAt).toBe(t + 30_000);
    t = afterRate.nextAttemptAt + 1;
    await engine.sync();
    expect((await store.listOps())[0].status).toBe('rejected');
  });
});
