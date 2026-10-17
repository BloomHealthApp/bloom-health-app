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

describe('ApiClient (against mock contract server)', () => {
  it('OTP login returns the contract user shape and stores tokens', async () => {
    const { client, tokens } = make();
    await client.requestOtp('anu@example.com');
    const user = await client.verifyOtp('anu@example.com', MOCK_OTP);
    expect(user).toMatchObject({ role: 'owner', ownerDisplayName: 'Anu', theme: 'cottonCandy' });
    expect(tokens()?.refreshToken).toBeTruthy();
  });
  it('wrong code => 401 unauthorized; unknown email gets 202 on request (no enumeration)', async () => {
    const { client } = make();
    await expect(client.requestOtp('nobody@example.com')).resolves.toBeUndefined();
    await expect(client.verifyOtp('anu@example.com', '000000')).rejects.toMatchObject({ status: 401, code: 'unauthorized' });
  });
  it('refreshes on token_expired and retries once; concurrent calls share one refresh (rotating token)', async () => {
    const a = make();
    await a.client.verifyOtp('anu@example.com', MOCK_OTP);
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
    await client.verifyOtp('aman@example.com', MOCK_OTP);
    await expect(client.syncPush('d', [])).rejects.toMatchObject({ status: 403 });
    await expect(client.request('PATCH', '/me', { body: { role: 'owner' } })).rejects.toMatchObject({ status: 400, code: 'validation_failed' });
  });
});
