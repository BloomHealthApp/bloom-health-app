import React from 'react';
import renderer, { act } from 'react-test-renderer';
import ChooseAvatar from '@/app/choose-avatar';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { User } from '@/types/api';
import { avatarPromptKey, markAvatarPrompted, useAvatarPrompt, type AvatarPromptState } from '../avatarPrompt';

const mockStore = new Map<string, string>();
let mockFailReads = false;
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (k: string) => {
    if (mockFailReads) throw new Error('storage down');
    return mockStore.get(k) ?? null;
  },
  setItem: async (k: string, v: string) => void mockStore.set(k, v),
  removeItem: async (k: string) => void mockStore.delete(k),
}));

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Redirect: ({ href }: { href: string }) => require('react').createElement('Redirect', { href }),
}));

const mockAuth: { status: string; user: User | null; api: { patchMe: jest.Mock }; updateUser: jest.Mock } = {
  status: 'signedIn',
  user: null,
  api: { patchMe: jest.fn() },
  updateUser: jest.fn(),
};
jest.mock('@/providers/AuthProvider', () => ({ useAuth: () => mockAuth }));

const user = (over: Partial<User> = {}): User => ({ id: 'u1', email: 'a@b.co', displayName: 'Mia', avatar: null, timezone: 'UTC', theme: 'cottonCandy', role: 'owner', sharedSpaceId: 's', ownerDisplayName: 'Mia', ...over });

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
function render(el: React.ReactElement) {
  let t!: renderer.ReactTestRenderer;
  act(() => {
    t = renderer.create(<ThemeProvider>{el}</ThemeProvider>);
  });
  return t;
}
const press = (t: renderer.ReactTestRenderer, label: string) =>
  act(async () => {
    await t.root.find((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function').props.onPress();
  });

beforeEach(() => {
  mockStore.clear();
  mockFailReads = false;
  mockReplace.mockReset();
  mockAuth.status = 'signedIn';
  mockAuth.user = user();
  mockAuth.api.patchMe.mockReset();
  mockAuth.updateUser.mockReset();
});

describe('choose-avatar screen', () => {
  it('Continue saves the default avatar, updates the user, sets the one-time flag and goes to the tabs', async () => {
    mockAuth.api.patchMe.mockResolvedValue(user({ avatar: 'bubu-01' }));
    const t = render(<ChooseAvatar />);
    await press(t, 'Continue');
    expect(mockAuth.api.patchMe).toHaveBeenCalledWith({ avatar: 'bubu-01' });
    expect(mockAuth.updateUser).toHaveBeenCalledWith(expect.objectContaining({ avatar: 'bubu-01' }));
    expect(mockStore.get(avatarPromptKey('u1'))).toBe('1');
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('saves the avatar that was picked', async () => {
    mockAuth.api.patchMe.mockResolvedValue(user({ avatar: 'bubu-08' }));
    const t = render(<ChooseAvatar />);
    await press(t, 'Sweet Tooth avatar');
    await press(t, 'Continue');
    expect(mockAuth.api.patchMe).toHaveBeenCalledWith({ avatar: 'bubu-08' });
  });

  it('Skip leaves the avatar unset, sets the flag and does not call the API', async () => {
    const t = render(<ChooseAvatar />);
    await press(t, 'Skip for now');
    expect(mockAuth.api.patchMe).not.toHaveBeenCalled();
    expect(mockAuth.updateUser).not.toHaveBeenCalled();
    expect(mockStore.get(avatarPromptKey('u1'))).toBe('1');
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('a failed save shows an error, keeps the user on the screen and can still be skipped', async () => {
    mockAuth.api.patchMe.mockRejectedValue(new Error('offline'));
    const t = render(<ChooseAvatar />);
    await press(t, 'Continue');
    expect(JSON.stringify(t.toJSON())).toContain('Could not save your Bloom');
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockStore.has(avatarPromptKey('u1'))).toBe(false);
    await press(t, 'Skip for now');
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('redirects to welcome when signed out', () => {
    mockAuth.status = 'signedOut';
    mockAuth.user = null;
    expect(JSON.stringify(render(<ChooseAvatar />).toJSON())).toContain('/(auth)/welcome');
  });
});

describe('one-time prompt (useAvatarPrompt)', () => {
  function probe(u: User | null) {
    const seen: AvatarPromptState[] = [];
    function P({ u }: { u: User | null }) {
      seen.push(useAvatarPrompt(u));
      return null;
    }
    const t = render(<P u={u} />);
    return { seen, t, last: () => seen[seen.length - 1], rerender: (n: User | null) => act(() => t.update(<ThemeProvider><P u={n} /></ThemeProvider>)) };
  }

  it('is due for a new user without an avatar and no flag', async () => {
    const p = probe(user());
    expect(p.last()).toBe('checking');
    await flush();
    expect(p.last()).toBe('show');
  });
  it('is not due once the flag is set (after skip) even though the avatar is still null', async () => {
    await markAvatarPrompted('u1');
    const p = probe(user());
    await flush();
    expect(p.last()).toBe('done');
  });
  it('is not due when the user already has an avatar', async () => {
    const p = probe(user({ avatar: 'bubu-03' }));
    await flush();
    expect(p.last()).toBe('done');
    expect(p.seen).not.toContain('show');
  });
  it('is tracked per account', async () => {
    await markAvatarPrompted('someone-else');
    const p = probe(user());
    await flush();
    expect(p.last()).toBe('show');
  });
  it('never traps the user when storage fails', async () => {
    mockFailReads = true;
    const p = probe(user());
    await flush();
    expect(p.last()).toBe('done');
  });
  it('turns off after the avatar is set in the same session', async () => {
    const p = probe(user());
    await flush();
    expect(p.last()).toBe('show');
    p.rerender(user({ avatar: 'bubu-02' }));
    expect(p.last()).toBe('done');
  });
});
