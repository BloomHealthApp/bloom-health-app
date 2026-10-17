import { ApiClient, type TokenState } from '../client';
import { ApiError } from '../errors';
import { MOCK_OTP, mockFetch, resetMockServer } from '../mock/mockServer';
import { AVATAR_IDS } from '@/avatars/avatarCatalog';

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
async function signIn(client: ApiClient, identifier: string) {
  const { challengeId } = await client.requestSignIn(identifier);
  return client.verifyOtp(challengeId, MOCK_OTP);
}
async function signUp(client: ApiClient, extra: Record<string, unknown> = {}) {
  const { challengeId } = await client.requestSignUp({ name: 'Mia', phone: '+919811100001', email: 'mia@example.com', ...extra } as never);
  return client.verifyOtp(challengeId, MOCK_OTP);
}

beforeEach(() => resetMockServer());

describe('avatars in the mock contract server', () => {
  it('demo users have avatars and the viewer sees the owner avatar', async () => {
    const owner = await signIn(make(), 'anu@example.com');
    const viewer = await signIn(make(), 'aman@example.com');
    expect(owner.avatar).toBe('bubu-02');
    expect(owner.ownerAvatar).toBe(owner.avatar);
    expect(viewer.avatar).toBe('bubu-04');
    expect(viewer.ownerAvatar).toBe('bubu-02');
  });

  it.each([...AVATAR_IDS])('PATCH /me accepts %s and GET /me returns it', async (id) => {
    const c = make();
    await signIn(c, 'anu@example.com');
    expect(await c.patchMe({ avatar: id })).toMatchObject({ avatar: id, ownerAvatar: id });
    expect(await c.getMe()).toMatchObject({ avatar: id, ownerAvatar: id });
  });

  it('PATCH /me accepts null to clear the avatar', async () => {
    const c = make();
    await signIn(c, 'anu@example.com');
    expect(await c.patchMe({ avatar: null })).toMatchObject({ avatar: null, ownerAvatar: null });
  });

  it.each(['evil', 'bubu-00', 'bubu-10', '', 'https://x.test/a.png'])('PATCH /me rejects %p with 400 and changes nothing', async (bad) => {
    const c = make();
    await signIn(c, 'anu@example.com');
    const e = await c.patchMe({ displayName: 'Changed', avatar: bad }).catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 400, code: 'validation_failed' });
    expect(await c.getMe()).toMatchObject({ displayName: 'Anu', avatar: 'bubu-02' });
  });

  it('a viewer sees the owner avatar change, and changing their own does not affect it', async () => {
    const owner = make();
    const viewer = make();
    await signIn(owner, 'anu@example.com');
    await signIn(viewer, 'aman@example.com');
    await owner.patchMe({ avatar: 'bubu-09' });
    expect(await viewer.getMe()).toMatchObject({ avatar: 'bubu-04', ownerAvatar: 'bubu-09' });
    expect(await viewer.patchMe({ avatar: 'bubu-05' })).toMatchObject({ avatar: 'bubu-05', ownerAvatar: 'bubu-09' });
  });

  it('new sign-ups start with a null avatar', async () => {
    expect(await signUp(make())).toMatchObject({ role: 'owner', avatar: null, ownerAvatar: null });
  });

  it('sign-up accepts an optional allowlisted avatar and rejects others', async () => {
    expect(await signUp(make(), { avatar: 'bubu-06' })).toMatchObject({ avatar: 'bubu-06', ownerAvatar: 'bubu-06' });
    resetMockServer();
    const e = await make().requestSignUp({ name: 'Mia', phone: '+919811100001', email: 'mia@example.com', avatar: 'evil' }).catch((x) => x);
    expect(e).toMatchObject({ status: 400, code: 'validation_failed' });
  });
});
