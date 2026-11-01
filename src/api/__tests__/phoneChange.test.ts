import { ApiClient, type TokenState } from '../client';
import { MOCK_OTP, mockFetch, resetMockServer } from '../mock/mockServer';

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
async function signIn(c: ApiClient, id: string) {
  const { challengeId } = await c.requestSignIn(id);
  return c.verifyOtp(challengeId, MOCK_OTP);
}

beforeEach(() => resetMockServer());

describe('phone change', () => {
  it('saves only after the code, then the number signs in', async () => {
    const c = make();
    const before = await signIn(c, 'anu@example.com');
    const { challengeId } = await c.requestPhoneChange('9811122222');
    expect((await c.getMe()).phone).toBe(before.phone);
    expect((await c.verifyPhoneChange(challengeId, MOCK_OTP)).phone).toBe('+919811122222');
    expect((await signIn(make(), '+919811122222')).id).toBe(before.id);
  });
  it('rejects a wrong code without losing the session', async () => {
    const c = make();
    const before = await signIn(c, 'anu@example.com');
    const { challengeId } = await c.requestPhoneChange('9811122222');
    await expect(c.verifyPhoneChange(challengeId, '000000')).rejects.toMatchObject({ status: 400 });
    expect((await c.getMe()).phone).toBe(before.phone);
  });
  it("won't use another account's number or another user's code", async () => {
    const anu = make();
    const aman = make();
    await signIn(anu, 'anu@example.com');
    const viewer = await signIn(aman, 'aman@example.com');
    await expect(anu.requestPhoneChange(viewer.phone as string)).rejects.toMatchObject({ status: 409, code: 'already_registered' });
    const { challengeId } = await anu.requestPhoneChange('9811122222');
    await expect(aman.verifyPhoneChange(challengeId, MOCK_OTP)).rejects.toMatchObject({ status: 400 });
  });
  it('PATCH /me no longer accepts a phone', async () => {
    const c = make();
    await signIn(c, 'anu@example.com');
    await expect(c.patchMe({ phone: '9811122222' } as never)).rejects.toMatchObject({ status: 400 });
  });
});
