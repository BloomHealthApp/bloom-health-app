import { addDays, localDateInTz } from '@/lib/dates';
import type { PushOperation } from '@/types/api';
import { ApiClient, type TokenState } from '../client';
import { ApiError } from '../errors';
import { MOCK_OTP, mockFetch, resetMockServer } from '../mock/mockServer';

const TZ = 'Asia/Kolkata';
const TODAY = localDateInTz(new Date(), TZ);

function make() {
  let tokens: TokenState | null = null;
  return new ApiClient('http://mock', mockFetch, {
    get: async () => tokens ?? { accessToken: null, refreshToken: null, expiresAt: null },
    set: async (t) => {
      tokens = t;
    },
    onAuthLost: jest.fn(),
  });
}
async function signIn(identifier: string) {
  const c = make();
  const { challengeId } = await c.requestSignIn(identifier);
  const user = await c.verifyOtp(challengeId, MOCK_OTP);
  return { c, user };
}
async function signUp(extra: Record<string, unknown> = {}) {
  const c = make();
  const { challengeId } = await c.requestSignUp({ name: 'Mia', phone: '+919811100001', email: 'mia@example.com', ...extra } as never);
  const user = await c.verifyOtp(challengeId, MOCK_OTP);
  return { c, user };
}
const op = (id: string, payload: Record<string, unknown>, extra: Partial<PushOperation> = {}): PushOperation => ({
  operationId: `op-${id}-${Math.random()}`,
  entityType: 'period',
  entityId: id,
  op: 'upsert',
  baseVersion: 0,
  payload,
  clientTimestamp: new Date().toISOString(),
  ...extra,
});

beforeEach(() => resetMockServer());

describe('gender + period tracker flag (mock contract)', () => {
  it('demo accounts expose gender and the computed periodTrackerEnabled', async () => {
    const { user: anu } = await signIn('anu@example.com');
    expect(anu).toMatchObject({ gender: 'female', periodTrackerEnabled: true });
    const { user: aman } = await signIn('aman@example.com');
    expect(aman).toMatchObject({ gender: 'male', periodTrackerEnabled: false });
  });

  it('sign-up accepts an optional gender; omitting it leaves null and the tracker off', async () => {
    expect((await signUp({ gender: 'female' })).user).toMatchObject({ gender: 'female', periodTrackerEnabled: true });
    resetMockServer();
    expect((await signUp()).user).toMatchObject({ gender: null, periodTrackerEnabled: false });
    resetMockServer();
    expect((await signUp({ gender: 'other' })).user).toMatchObject({ gender: 'other', periodTrackerEnabled: false });
  });

  it('sign-up rejects an invalid gender with 400', async () => {
    const c = make();
    await expect(c.requestSignUp({ name: 'Mia', phone: '+919811100001', email: 'mia@example.com', gender: 'robot' } as never)).rejects.toMatchObject({ status: 400, code: 'validation_failed' });
  });

  it('PATCH /me validates gender and periodTrackerEnabled; null resets to the gender default', async () => {
    const { c } = await signUp({ gender: 'other' });
    expect(await c.patchMe({ periodTrackerEnabled: true })).toMatchObject({ periodTrackerEnabled: true });
    expect(await c.patchMe({ gender: 'female', periodTrackerEnabled: null })).toMatchObject({ gender: 'female', periodTrackerEnabled: true });
    expect(await c.patchMe({ periodTrackerEnabled: false })).toMatchObject({ periodTrackerEnabled: false });
    expect(await c.patchMe({ gender: 'male', periodTrackerEnabled: null })).toMatchObject({ gender: 'male', periodTrackerEnabled: false });
    expect(await c.patchMe({ gender: null })).toMatchObject({ gender: null });
    await expect(c.patchMe({ gender: 'x' as never })).rejects.toMatchObject({ status: 400 });
    await expect(c.patchMe({ periodTrackerEnabled: 'yes' as never })).rejects.toMatchObject({ status: 400 });
    expect(await c.getMe()).toMatchObject({ gender: null });
  });
});

describe('periods are private to the owner', () => {
  it('owner pulls period rows; viewer gets changes.periods = [] and no period rows in the cursor stream', async () => {
    const { c: owner } = await signIn('anu@example.com');
    const { c: viewer } = await signIn('aman@example.com');
    const o = await owner.syncPull('', 500);
    expect(o.changes.periods.length).toBe(3);
    const v = await viewer.syncPull('', 500);
    expect(v.changes.periods).toEqual([]);
    expect(v.changes.habits.length).toBeGreaterThan(0);
    // a period written later never reaches the viewer either
    await owner.syncPush('d1', [op('p-new', { startDate: addDays(TODAY, -1), endDate: null, flow: 'light', symptoms: [], mood: null, note: null })]);
    const v2 = await viewer.syncPull(v.cursor, 500);
    expect(v2.changes.periods).toEqual([]);
  });

  it('viewer cannot push periods (403) and gets 403 on /periods', async () => {
    const { c: viewer } = await signIn('aman@example.com');
    await expect(viewer.syncPush('d', [op('p-x', { startDate: addDays(TODAY, -1) })])).rejects.toMatchObject({ status: 403 });
    await expect(viewer.listPeriods()).rejects.toMatchObject({ status: 403 });
  });

  it('owner with the tracker disabled: /periods is 403 and pushed periods are rejected', async () => {
    const { c } = await signUp({ gender: 'male' });
    await expect(c.listPeriods()).rejects.toBeInstanceOf(ApiError);
    await expect(c.listPeriods()).rejects.toMatchObject({ status: 403 });
    const [r] = await c.syncPush('d', [op('p1', { startDate: addDays(TODAY, -1), endDate: null, flow: 'light', symptoms: [], mood: null, note: null })]);
    expect(r).toMatchObject({ status: 'rejected', reason: 'tracker_disabled' });
  });

  it('owner GET /periods lists non-deleted periods', async () => {
    const { c } = await signIn('anu@example.com');
    expect((await c.listPeriods()).length).toBe(3);
  });
});

describe('period validation (sync push)', () => {
  const base = { endDate: null, flow: 'medium', symptoms: [], mood: null, note: null };
  const push = async (c: ApiClient, id: string, payload: Record<string, unknown>) => (await c.syncPush('d', [op(id, { ...base, ...payload })]))[0];

  it('accepts a valid ongoing period then ends it', async () => {
    const { c } = await signUp({ gender: 'female' });
    const r = await push(c, 'p1', { startDate: addDays(TODAY, -2) });
    expect(r.status).toBe('applied');
    const end = await c.syncPush('d', [op('p1', { endDate: TODAY, flow: 'heavy', symptoms: ['cramps'], mood: 'calm' }, { baseVersion: 1 })]);
    expect(end[0]).toMatchObject({ status: 'applied', entity: { endDate: TODAY, flow: 'heavy', version: 2 } });
  });

  it.each([
    ['future start', { startDate: addDays(TODAY, 1) }, 'future_date'],
    ['end before start', { startDate: addDays(TODAY, -3), endDate: addDays(TODAY, -4) }, 'end_before_start'],
    ['longer than 14 days', { startDate: addDays(TODAY, -20), endDate: addDays(TODAY, -5) }, 'too_long'],
    ['bad flow', { startDate: addDays(TODAY, -3), flow: 'gushing' }, 'invalid_flow'],
    ['bad symptom', { startDate: addDays(TODAY, -3), symptoms: ['cramps', 'plague'] }, 'invalid_symptom'],
    ['11 symptoms', { startDate: addDays(TODAY, -3), symptoms: Array.from({ length: 11 }, (_, i) => `s${i}`) }, 'too_many_symptoms'],
    ['bad mood', { startDate: addDays(TODAY, -3), mood: 'elated' }, 'invalid_mood'],
    ['long note', { startDate: addDays(TODAY, -3), note: 'x'.repeat(501) }, 'note_too_long'],
  ])('rejects %s', async (_n, payload, reason) => {
    const { c } = await signUp({ gender: 'female' });
    expect(await push(c, 'p1', payload)).toMatchObject({ status: 'rejected', reason: `validation_failed:${reason}` });
  });

  it('rejects overlap and a second ongoing period; allows adjacent non-overlapping ones', async () => {
    const { c } = await signUp({ gender: 'female' });
    expect((await push(c, 'a', { startDate: addDays(TODAY, -30), endDate: addDays(TODAY, -26) })).status).toBe('applied');
    expect(await push(c, 'b', { startDate: addDays(TODAY, -28), endDate: addDays(TODAY, -24) })).toMatchObject({ status: 'rejected', reason: 'validation_failed:overlap' });
    expect((await push(c, 'c', { startDate: addDays(TODAY, -25), endDate: addDays(TODAY, -22) })).status).toBe('applied');
    expect((await push(c, 'd', { startDate: addDays(TODAY, -3) })).status).toBe('applied'); // ongoing
    expect(await push(c, 'e', { startDate: addDays(TODAY, -1) })).toMatchObject({ status: 'rejected' });
  });

  it('deleting tombstones the period so it frees the range', async () => {
    const { c } = await signUp({ gender: 'female' });
    await push(c, 'a', { startDate: addDays(TODAY, -10), endDate: addDays(TODAY, -7) });
    const del = await c.syncPush('d', [op('a', {}, { op: 'delete', baseVersion: 1 })]);
    expect(del[0].entity).toMatchObject({ deletedAt: expect.any(String) });
    expect((await push(c, 'b', { startDate: addDays(TODAY, -9), endDate: addDays(TODAY, -8) })).status).toBe('applied');
  });
});

describe('/stats/summary with neutral days', () => {
  it('counts period days and Sundays as rest days for owner and viewer alike, never saying why', async () => {
    const { c: owner } = await signIn('anu@example.com');
    const { c: viewer } = await signIn('aman@example.com');
    const from = addDays(TODAY, -14);
    const [os, vs] = await Promise.all([owner.getStats(from, TODAY), viewer.getStats(from, TODAY)]);
    expect(vs).toEqual(os);
    // seeded latest period: today-7 .. today-3
    for (let back = 7; back >= 3; back--) expect(os.days.find((d) => d.localDate === addDays(TODAY, -back))!.restDay).toBe(true);
    expect(JSON.stringify(vs)).not.toMatch(/period/i);
  });

  it('a disabled owner tracker means period days are not neutral', async () => {
    const { c: owner } = await signIn('anu@example.com');
    await owner.patchMe({ periodTrackerEnabled: false });
    const { c: viewer } = await signIn('aman@example.com');
    const s = await viewer.getStats(addDays(TODAY, -10), TODAY);
    const periodDay = addDays(TODAY, -5);
    const isSunday = new Date(`${periodDay}T00:00:00Z`).getUTCDay() === 0;
    expect(s.days.find((d) => d.localDate === periodDay)!.restDay).toBe(isSunday);
  });
});

describe('settings sundayRest', () => {
  it('defaults to true, can be turned off via push, and rejects non-booleans', async () => {
    const { c } = await signIn('anu@example.com');
    const pulled = await c.syncPull('', 500);
    expect(pulled.changes.settings[0].sundayRest).toBe(true);
    const id = pulled.changes.settings[0].id;
    const mk = (payload: Record<string, unknown>, v: number) => op(id, payload, { entityType: 'settings', baseVersion: v });
    const r = await c.syncPush('d', [mk({ sundayRest: false }, 1)]);
    expect(r[0]).toMatchObject({ status: 'applied', entity: { sundayRest: false } });
    const bad = await c.syncPush('d', [mk({ sundayRest: 'no' }, 2)]);
    expect(bad[0]).toMatchObject({ status: 'rejected' });
  });
});
