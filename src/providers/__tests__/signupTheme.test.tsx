import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { MOCK_OTP, resetMockServer } from '@/api/mock/mockServer';
import type { ThemeName } from '@/types/api';
import { AuthProvider, useAuth } from '../AuthProvider';

jest.mock('@/config', () => ({ API_BASE_URL: 'http://mock', USE_MOCK_API: true }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
}));
jest.mock('@/auth/tokenStore', () => ({
  createTokenProvider: () => {
    let tokens = { accessToken: null, refreshToken: null, expiresAt: null };
    return { get: async () => tokens, set: async (t: typeof tokens) => void (tokens = t), onAuthLost: () => {} };
  },
}));

let auth: ReturnType<typeof useAuth>;
const capture = (value: typeof auth) => {
  auth = value;
};
function Capture({ onValue }: { onValue: typeof capture }) {
  onValue(useAuth());
  return null;
}

async function mount() {
  await act(async () => {
    renderer.create(<AuthProvider><Capture onValue={capture} /></AuthProvider>);
  });
}
async function signUp(signupTheme?: ThemeName) {
  const { challengeId } = await auth.requestSignUp({ name: 'Mia', phone: '+919811100001', email: 'mia@example.com', gender: null });
  await act(async () => {
    await auth.verifyOtp(challengeId, MOCK_OTP, signupTheme);
  });
}

beforeEach(() => resetMockServer());

describe('theme picked before signup', () => {
  it('is saved on the new account', async () => {
    await mount();
    await signUp('midnightNavy');
    expect(auth.user?.theme).toBe('midnightNavy');
    expect(await auth.api.getMe()).toMatchObject({ theme: 'midnightNavy' });
  });

  it('leaves a new account on the default when none is passed', async () => {
    await mount();
    await signUp();
    expect(auth.user?.theme).toBe('forestTrail');
  });

  it('still signs the user in when saving the theme fails', async () => {
    await mount();
    jest.spyOn(auth.api, 'patchMe').mockRejectedValueOnce(new Error('offline'));
    await signUp('midnightNavy');
    expect(auth.status).toBe('signedIn');
    expect(auth.user?.theme).toBe('forestTrail');
  });

  it('does not change the saved theme on sign-in', async () => {
    await mount();
    const { challengeId } = await auth.requestSignIn('anu@example.com');
    await act(async () => {
      await auth.verifyOtp(challengeId, MOCK_OTP);
    });
    expect(auth.user?.theme).toBe('cottonCandy');
  });
});
