import { ApiClient, type TokenState } from '../client';
import { mockFetch, resetMockServer, MOCK_OTP } from '../mock/mockServer';
import { ApiError } from '../errors';

function make(initial?: TokenState) {
  let tokens: TokenState | null = initial ?? null;
  const lost = jest.fn();
  const fetchSpy = jest.fn(mockFetch);
  const client = new ApiClient('http://mock', fetchSpy, {
    get: async () => tokens ?? { accessToken: null, refreshToken: null, expiresAt: null },
    set: async (t) => {
      tokens = t;
    },
    onAuthLost: lost,
  });
  return { client, lost, fetchSpy, tokens: () => tokens };
}

beforeEach(() => resetMockServer());

async function signIn(client: ApiClient, identifier: string) {
  const { challengeId } = await client.requestSignIn(identifier);
  return client.verifyOtp(challengeId, MOCK_OTP);
}

describe('ApiClient (against mock contract server)', () => {
  it('sign-in by email returns the contract user shape (with phone) and stores tokens', async () => {
    const { client, tokens } = make();
    const user = await signIn(client, 'anu@example.com');
    expect(user).toMatchObject({ role: 'owner', ownerDisplayName: 'Anu', theme: 'cottonCandy', phone: '+919876543210' });
    expect(tokens()?.refreshToken).toBeTruthy();
  });
  it('sign-in by phone (any common formatting) logs into the same account', async () => {
    for (const id of ['+919876543210', '98765 43210', '+91-98765-43210']) {
      const { client } = make();
      expect(await signIn(client, id)).toMatchObject({ id: 'u-anu' });
    }
  });
  it('sign-up creates a new owner with their own empty space, then verify signs in', async () => {
    const { client } = make();
    const ch = await client.requestSignUp({ name: 'Zed', phone: '+44 7700 900123', email: 'Zed@Example.com' });
    expect(ch.status).toBe('sent');
    const user = await client.verifyOtp(ch.challengeId, MOCK_OTP);
    expect(user).toMatchObject({ displayName: 'Zed', email: 'zed@example.com', phone: '+447700900123', role: 'owner' });
    expect((await client.listHabits()).length).toBeGreaterThan(0);
    expect(await client.listLogs('2000-01-01', '2100-01-01')).toHaveLength(0);
    expect(await client.getSettings()).toBeTruthy();
    // the demo owner's history is untouched and not visible to the new user
    const anu = make();
    await signIn(anu.client, 'anu@example.com');
    expect((await anu.client.listLogs('2000-01-01', '2100-01-01')).length).toBeGreaterThan(0);
    // and the new account can sign in again by phone
    expect(await signIn(make().client, '+447700900123')).toMatchObject({ displayName: 'Zed' });
  });
  it('sign-up with a taken email or phone => 409 already_registered', async () => {
    const { client } = make();
    await expect(client.requestSignUp({ name: 'X', phone: '+15551234567', email: 'anu@example.com' })).rejects.toMatchObject({ status: 409, code: 'already_registered' });
    await expect(client.requestSignUp({ name: 'X', phone: '9876543210', email: 'new@example.com' })).rejects.toMatchObject({ status: 409, code: 'already_registered' });
  });
  it('sign-up validation => 400 validation_failed', async () => {
    const { client } = make();
    const ok = { name: 'Zed', phone: '+15551234567', email: 'z@example.com' };
    for (const bad of [{ name: '  ' }, { name: 'x'.repeat(41) }, { phone: '123' }, { phone: 'abc12345678' }, { email: 'nope' }]) {
      await expect(client.requestSignUp({ ...ok, ...bad })).rejects.toMatchObject({ status: 400, code: 'validation_failed' });
    }
  });
  it('wrong code => 401; unknown identifiers get a 202 decoy challenge that never verifies; challenges are single use', async () => {
    const { client } = make();
    const real = await client.requestSignIn('anu@example.com');
    await expect(client.verifyOtp(real.challengeId, '000000')).rejects.toMatchObject({ status: 401, code: 'unauthorized' });
    for (const id of ['nobody@example.com', '+15550000000', 'garbage']) {
      const decoy = await client.requestSignIn(id);
      expect(decoy.challengeId).toBeTruthy();
      expect(decoy.challengeId).not.toBe(real.challengeId);
      await expect(client.verifyOtp(decoy.challengeId, MOCK_OTP)).rejects.toMatchObject({ status: 401 });
    }
    await expect(client.verifyOtp('does-not-exist', MOCK_OTP)).rejects.toMatchObject({ status: 401 });
    await client.verifyOtp(real.challengeId, MOCK_OTP);
    await expect(client.verifyOtp(real.challengeId, MOCK_OTP)).rejects.toMatchObject({ status: 401 });
  });
  it('too many wrong attempts => 429 rate_limited', async () => {
    const { client } = make();
    const { challengeId } = await client.requestSignIn('anu@example.com');
    for (let i = 0; i < 5; i++) await expect(client.verifyOtp(challengeId, '000000')).rejects.toMatchObject({ status: 401 });
    await expect(client.verifyOtp(challengeId, MOCK_OTP)).rejects.toMatchObject({ status: 429, code: 'rate_limited' });
  });
  it('refreshes on token_expired and retries once; concurrent calls share one refresh (rotating token)', async () => {
    const a = make();
    await signIn(a.client, 'anu@example.com');
    const good = a.tokens()!;
    const expired = { ...good, accessToken: `ma.u-anu.${Date.now() - 1000}`, expiresAt: null };
    const { client, fetchSpy, tokens } = make(expired);
    const [m1, m2] = await Promise.all([client.getMe(), client.getMe()]);
    expect(m1.id).toBe('u-anu');
    expect(m2.id).toBe('u-anu');
    const refreshCalls = fetchSpy.mock.calls.filter(([u]) => String(u).endsWith('/v1/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
    expect(tokens()?.refreshToken).not.toBe(good.refreshToken);
  });
  it('failed refresh signs the user out via onAuthLost', async () => {
    const { client, lost } = make({ accessToken: 'ma.u-anu.1', refreshToken: 'mr.u-anu.bogus', expiresAt: null });
    await expect(client.getMe()).rejects.toBeInstanceOf(ApiError);
    expect(lost).toHaveBeenCalled();
  });
  it('viewer cannot push (403 forbidden) and unknown fields are rejected by /me', async () => {
    const { client } = make();
    await signIn(client, 'aman@example.com');
    await expect(client.syncPush('d', [])).rejects.toMatchObject({ status: 403 });
    await expect(client.request('PATCH', '/me', { body: { role: 'owner' } })).rejects.toMatchObject({ status: 400, code: 'validation_failed' });
  });
});
