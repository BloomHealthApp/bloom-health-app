import { StyleSheet } from 'react-native';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import ProfileTab from '@/app/(tabs)/profile';
import DailyGoalScreen from '@/app/settings/daily-goal';
import SettingsScreen from '@/app/settings';
import RemindersScreen from '@/app/settings/reminders';
import { toPublicProfile } from '@/lib/publicProfile';
import { ReminderRow, showsVolumeSlider } from '@/components/reminders/ReminderRow';
import SignUpScreen from '@/app/(auth)/signup';
import CalendarTab from '@/app/(tabs)/calendar';
import { defaultSettings, REMINDER_LABELS } from '@/lib/defaults';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { Reminder, Settings, User } from '@/types/api';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return { __esModule: true, default: { View }, Easing: { inOut: () => undefined, quad: undefined }, useAnimatedStyle: () => ({}), useReducedMotion: () => false, useSharedValue: (v: number) => ({ value: v }), withRepeat: (v: unknown) => v, withSequence: (...v: unknown[]) => v[0], withTiming: (v: unknown) => v };
});

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: () => {},
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Redirect: ({ href }: { href: string }) => require('react').createElement('Redirect', { href }),
}));
jest.mock('@/features/derived', () => ({
  useDerived: () => ({ currentStreak: 3, longestStreak: 9, activeHabits: [], logs: [], today: '2026-11-01', timezone: 'UTC', threshold: 80, loading: false, scoreFor: () => ({ neutral: true, restDay: false, completionPercent: 0 }) }),
  useToday: () => ({ today: '2026-11-01' }),
}));
jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.0' } }));

const mockAuth: { status: string; user: User | null; isOwner: boolean; api: { patchMe: jest.Mock }; updateUser: jest.Mock; signOut: jest.Mock; requestSignUp: jest.Mock } = {
  status: 'signedIn',
  user: null,
  isOwner: true,
  api: { patchMe: jest.fn() },
  updateUser: jest.fn(),
  signOut: jest.fn(),
  requestSignUp: jest.fn(),
};
jest.mock('@/providers/AuthProvider', () => ({ useAuth: () => mockAuth }));

const mockActions = { saveSettings: jest.fn(async () => {}), isOwner: true };
jest.mock('@/features/actions', () => ({ useActions: () => mockActions }));
const mockData: { settings: Settings } = { settings: defaultSettings() };
jest.mock('@/providers/DataProvider', () => ({
  useSettings: () => ({ settings: mockData.settings, loading: false }),
  useData: () => ({ syncNow: async () => {}, reminderStatus: null, refreshReminders: async () => null, engine: { sync: async () => {} } }),
  useSyncStatus: () => ({ state: 'synced', pending: 0, failed: 0, lastSyncedAt: null, lastError: null }),
  usePeriods: () => ({ periods: [], loading: false }),
}));
jest.mock('@/features/useSyncOnFocus', () => ({ useSyncOnFocus: () => {} }));

const user = (over: Partial<User> = {}): User => ({ id: 'u1', email: 'a@b.co', displayName: 'Mia', avatar: null, timezone: 'UTC', theme: 'cottonCandy', role: 'owner', sharedSpaceId: 's', ownerDisplayName: 'Mia', gender: null, periodTrackerEnabled: false, ...over });

function render(el: React.ReactElement) {
  let t!: renderer.ReactTestRenderer;
  act(() => {
    t = renderer.create(<ThemeProvider>{el}</ThemeProvider>);
  });
  return t;
}
const press = (t: renderer.ReactTestRenderer, label: string) =>
  act(async () => {
    const n = t.root.findAll((x) => x.props.accessibilityLabel === label && typeof x.props.onPress === 'function')[0];
    if (!n) throw new Error(`no pressable "${label}"`);
    await n.props.onPress();
  });
const sw = (t: renderer.ReactTestRenderer, label: string) => t.root.findAll((x) => x.props.accessibilityLabel === label && typeof x.props.onValueChange === 'function')[0];
const text = (t: renderer.ReactTestRenderer) => {
  const seen = new WeakSet<object>();
  return JSON.stringify(t.toJSON(), (_k, v) => {
    if (typeof v === 'function') return undefined;
    if (v && typeof v === 'object') {
      if (seen.has(v)) return undefined;
      seen.add(v);
    }
    return v;
  });
};

beforeEach(() => {
  mockPush.mockReset();
  mockAuth.status = 'signedIn';
  mockAuth.isOwner = true;
  mockAuth.user = user();
  mockAuth.api.patchMe.mockReset();
  mockAuth.updateUser.mockReset();
  mockAuth.requestSignUp.mockReset();
  mockActions.saveSettings.mockClear();
  mockData.settings = defaultSettings();
});

describe('Profile: public view', () => {
  it('only ever carries public fields', () => {
    const p = toPublicProfile(user({ email: 'a@b.co', phone: '+911', gender: 'female', periodTrackerEnabled: true }), { currentStreak: 1, longestStreak: 2, habits: 3 });
    expect(Object.keys(p).sort()).toEqual(['avatar', 'displayName', 'id', 'stats']);
    expect(JSON.stringify(p)).not.toMatch(/a@b\.co|\+911|female|period/i);
  });
  it('shows stats to an owner and opens Settings from the gear', async () => {
    const t = render(<ProfileTab />);
    expect(text(t)).toContain('day streak');
    await press(t, 'Settings');
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });
  it("doesn't show a viewer the owner's stats as their own", () => {
    mockAuth.user = user({ role: 'viewer' });
    mockAuth.isOwner = false;
    expect(text(render(<ProfileTab />))).not.toContain('day streak');
  });
  it('edits the name only after tapping Edit profile', async () => {
    const t = render(<ProfileTab />);
    expect(text(t)).not.toContain('Display name');
    await press(t, 'Edit profile');
    expect(text(t)).toContain('Display name');
  });
  it('Settings no longer holds profile details', () => {
    const json = text(render(<SettingsScreen />));
    expect(json).not.toContain('Display name');
    expect(json).not.toContain('a@b.co');
  });
});

describe('Profile: gender and period tracker', () => {
  it('female owners see the tracker switch (on), which points to the Calendar tab', () => {
    mockAuth.user = user({ gender: 'female', periodTrackerEnabled: true });
    const t = render(<ProfileTab />);
    expect(sw(t, 'Period tracker').props.value).toBe(true);
    expect(text(t)).toContain('Find it in the Calendar tab.');
  });

  it('other / prefer-not-to-say owners get an opt-in switch that starts off, and turning it on PATCHes periodTrackerEnabled', async () => {
    mockAuth.user = user({ gender: 'other', periodTrackerEnabled: false });
    mockAuth.api.patchMe.mockResolvedValue(user({ gender: 'other', periodTrackerEnabled: true }));
    const t = render(<ProfileTab />);
    expect(sw(t, 'Period tracker').props.value).toBe(false);
    expect(text(t)).not.toContain('Find it in the Calendar tab.');
    await act(async () => { await sw(t, 'Period tracker').props.onValueChange(true); });
    expect(mockAuth.api.patchMe).toHaveBeenCalledWith({ periodTrackerEnabled: true });
    expect(mockAuth.updateUser).toHaveBeenCalledWith(expect.objectContaining({ periodTrackerEnabled: true }));
  });

  it.each([
    ['male owner', { gender: 'male' as const }],
    ['owner without a gender', { gender: null }],
    ['viewer, even if female', { gender: 'female' as const, role: 'viewer' as const, periodTrackerEnabled: false }],
  ] as [string, Partial<User>][])('hides the tracker switch for a %s', (_n, over) => {
    mockAuth.user = user(over);
    mockAuth.isOwner = over.role !== 'viewer';
    const t = render(<ProfileTab />);
    expect(sw(t, 'Period tracker')).toBeUndefined();
    expect(text(t)).not.toMatch(/period/i);
  });

  it('gender picker saves via PATCH /me; choosing male also resets the tracker flag; tapping the selected one clears it', async () => {
    mockAuth.user = user({ gender: 'female', periodTrackerEnabled: true });
    mockAuth.api.patchMe.mockResolvedValue(user({ gender: 'male' }));
    const t = render(<ProfileTab />);
    await press(t, 'Male');
    expect(mockAuth.api.patchMe).toHaveBeenLastCalledWith({ gender: 'male', periodTrackerEnabled: null });
    await press(t, 'Female');
    expect(mockAuth.api.patchMe).toHaveBeenLastCalledWith({ gender: null, periodTrackerEnabled: null });
    await press(t, 'Other');
    expect(mockAuth.api.patchMe).toHaveBeenLastCalledWith({ gender: 'other' });
  });

  it('a failed save shows an error banner', async () => {
    mockAuth.user = user({ gender: 'other' });
    mockAuth.api.patchMe.mockRejectedValue(new Error('No connection.'));
    const t = render(<ProfileTab />);
    await act(async () => { await sw(t, 'Period tracker').props.onValueChange(true); });
    expect(text(t)).toContain('No connection.');
  });

  });

describe('Settings: Sunday switch', () => {
  it("Sundays don't break my streak: on by default, absent means on, toggling saves sundayRest", async () => {
    mockData.settings = { ...defaultSettings(), sundayRest: undefined };
    const t = render(<DailyGoalScreen />);
    expect(sw(t, "Sundays don't break my streak").props.value).toBe(true);
    await act(async () => { await sw(t, "Sundays don't break my streak").props.onValueChange(false); });
    expect(mockActions.saveSettings).toHaveBeenCalledWith({ sundayRest: false }, mockData.settings);
  });

  it('viewers cannot change the Sunday switch', () => {
    mockAuth.user = user({ role: 'viewer', gender: 'male' });
    mockAuth.isOwner = false;
    const t = render(<DailyGoalScreen />);
    expect(sw(t, "Sundays don't break my streak").props.disabled).toBe(true);
  });
});

describe('Settings list', () => {
  const rows = (t: renderer.ReactTestRenderer) => t.root.findAll((x) => typeof x.type === 'string' && x.props.accessibilityRole === 'button' && typeof x.props.accessibilityLabel === 'string').map((x) => x.props.accessibilityLabel as string);
  it('lists each setting and opens its own page', async () => {
    const t = render(<SettingsScreen />);
    expect(text(t)).not.toContain('Count a day as successful at');
    expect(text(t)).not.toContain('Choose your rest days');
    await press(t, 'Daily goal, 80%');
    expect(mockPush).toHaveBeenLastCalledWith('/settings/daily-goal');
    expect(rows(t).some((l) => l.startsWith('Appearance'))).toBe(true);
    expect(rows(t).some((l) => l.startsWith('Reminders'))).toBe(true);
  });
  it('hides Reminders from viewers and keeps them off its page', () => {
    mockAuth.user = user({ role: 'viewer' });
    mockAuth.isOwner = false;
    expect(rows(render(<SettingsScreen />)).some((l) => l.startsWith('Reminders'))).toBe(false);
    expect(render(<RemindersScreen />).root.findAllByType('Redirect' as never)).toHaveLength(1);
  });
  it('asks before signing out', async () => {
    const t = render(<SettingsScreen />);
    await press(t, 'Sign out');
    expect(mockAuth.signOut).not.toHaveBeenCalled();
    expect(text(t)).toContain('Sign out?');
  });
});

describe('Settings: daily goal row', () => {
  it('keeps the steppers inside the card by letting the label wrap', () => {
    mockAuth.user = user();
    const t = render(<DailyGoalScreen />);
    const flat = (x: renderer.ReactTestInstance) => StyleSheet.flatten(x.props.style);
    const label = t.root.findAll((x) => typeof x.type === 'string' && x.props.children === 'Count a day as successful at')[0];
    expect(flat(label).flex).toBe(1);
    for (const name of ['Decrease', 'Increase']) {
      const b = t.root.findAll((x) => typeof x.type === 'string' && String(x.props.accessibilityLabel).startsWith(`${name} g`))[0];
      expect(flat(b)).toMatchObject({ width: 44, paddingHorizontal: 0 });
    }
  });
});

describe('Settings: reminder alert types', () => {
  const radios = (t: renderer.ReactTestRenderer) => t.root.findAll((x) => x.props.accessibilityRole === 'radio' && typeof x.props.onPress === 'function' && /: (Notification|Alarm|Loud alarm)$/.test(x.props.accessibilityLabel));

  it('offers owners two alert types per reminder, defaulting to notification', () => {
    mockAuth.user = user();
    const t = render(<RemindersScreen />);
    expect(radios(t)).toHaveLength(10);
    const wake = radios(t).filter((x) => x.props.accessibilityLabel.startsWith('Good morning:'));
    expect(wake.map((x) => x.props.accessibilityLabel)).toEqual(['Good morning: Notification', 'Good morning: Loud alarm']);
    expect(wake.map((x) => x.props.accessibilityState.checked)).toEqual([true, false]);
  });
  it('tapping an option shows its preview, and tapping it again hides it', async () => {
    mockAuth.user = user();
    const t = render(<RemindersScreen />);
    const previews = () => t.root.findAll((x) => typeof x.type === 'string' && x.props.testID === 'reminder-preview');
    expect(previews()).toHaveLength(0);
    await press(t, 'Good morning: Notification');
    expect(previews()).toHaveLength(1);
    expect(t.root.findAll((x) => typeof x.props.accessibilityLabel === 'string' && x.props.accessibilityLabel.startsWith('Notification preview:')).length).toBeGreaterThan(0);
    await press(t, 'Good morning: Notification');
    expect(previews()).toHaveLength(0);
  });
  it('choosing another option closes the preview, and tapping it again previews Loud alarm with a play button', async () => {
    mockAuth.user = user();
    const t = render(<RemindersScreen />);
    await press(t, 'Good morning: Notification');
    expect(t.root.findAll((x) => typeof x.type === 'string' && x.props.testID === 'reminder-preview')).toHaveLength(1);
    await press(t, 'Hydration check: Loud alarm');
    expect(t.root.findAll((x) => typeof x.type === 'string' && x.props.testID === 'reminder-preview')).toHaveLength(0);
    await press(t, 'Hydration check: Loud alarm');
    expect(t.root.findAll((x) => typeof x.type === 'string' && x.props.testID === 'reminder-preview')).toHaveLength(1);
    expect(t.root.findAll((x) => x.props.accessibilityLabel === 'Play alarm sound').length).toBeGreaterThan(0);
  });
  it('is hidden from viewers', () => {
    mockAuth.user = user({ role: 'viewer' });
    mockAuth.isOwner = false;
    expect(radios(render(<RemindersScreen />))).toHaveLength(0);
  });
  it('shows the alert options as named icons, after the on/off button', () => {
    const reminder = { key: Object.keys(REMINDER_LABELS)[0], enabled: true, time: '07:00' } as unknown as Reminder;
    const t = render(<ReminderRow reminder={reminder} mode="notification" volume={1} previewing={false} onChange={() => {}} onChooseMode={() => {}} onVolumeChange={() => {}} />);
    const json = JSON.stringify(t.toJSON());
    expect(json.indexOf('Good morning reminder')).toBeLessThan(json.indexOf('Good morning: Notification'));
    const text = t.root.findAll((x) => typeof x.props.children === 'string').map((x) => x.props.children);
    for (const word of ['Notification', 'Loud alarm']) expect(text).not.toContain(word);
  });
  it('shows a reminder saved as a plain alarm under the alarm icon', () => {
    const reminder = { key: Object.keys(REMINDER_LABELS)[0], enabled: true, time: '07:00' } as unknown as Reminder;
    const t = render(<ReminderRow reminder={reminder} mode="alarm" volume={1} previewing={false} onChange={() => {}} onChooseMode={() => {}} onVolumeChange={() => {}} />);
    expect(radios(t).map((x) => x.props.accessibilityState.checked)).toEqual([false, true]);
  });
});

describe('volume slider availability', () => {
  it('appears only where the OS honours it: Android loud alarms', () => {
    expect(showsVolumeSlider('loudAlarm', 'android')).toBe(true);
    expect(showsVolumeSlider('loudAlarm', 'ios')).toBe(false);
    expect(showsVolumeSlider('alarm', 'android')).toBe(false);
    expect(showsVolumeSlider('notification', 'android')).toBe(false);
  });
});

describe('sign-up gender selector', () => {
  const fill = (t: renderer.ReactTestRenderer) => {
    act(() => {
      t.root.findByProps({ accessibilityLabel: 'Your name' }).props.onChangeText('Mia');
      t.root.findByProps({ accessibilityLabel: 'Phone' }).props.onChangeText('+919811100001');
      t.root.findByProps({ accessibilityLabel: 'Email' }).props.onChangeText('mia@example.com');
    });
  };
  it('is optional: omitted gender is not sent as a truthy value', async () => {
    mockAuth.requestSignUp.mockResolvedValue({ status: 'sent', challengeId: 'c' });
    const t = render(<SignUpScreen />);
    fill(t);
    await press(t, 'Send code');
    expect(mockAuth.requestSignUp).toHaveBeenCalledWith({ name: 'Mia', phone: '+919811100001', email: 'mia@example.com', gender: null });
  });
  it('sends the chosen gender, and it can be cleared again', async () => {
    mockAuth.requestSignUp.mockResolvedValue({ status: 'sent', challengeId: 'c' });
    const t = render(<SignUpScreen />);
    fill(t);
    await press(t, 'Prefer not to say');
    await press(t, 'Send code');
    expect(mockAuth.requestSignUp).toHaveBeenLastCalledWith(expect.objectContaining({ gender: 'prefer_not_to_say' }));
    await press(t, 'Prefer not to say'); // clear
    await press(t, 'Send code');
    expect(mockAuth.requestSignUp).toHaveBeenLastCalledWith(expect.objectContaining({ gender: null }));
  });
});

describe('period tracker in the Calendar tab', () => {
  const tab = (t: renderer.ReactTestRenderer) => t.root.findAll((x) => x.props.accessibilityLabel === 'Periods' && typeof x.props.onPress === 'function');

  it.each([
    ['viewer', { role: 'viewer' as const, gender: 'female' as const, periodTrackerEnabled: true }],
    ['owner with the tracker off', { gender: 'male' as const }],
  ] as [string, Partial<User>][])('never offers it to a %s', (_n, over) => {
    mockAuth.user = user(over);
    mockAuth.isOwner = over.role !== 'viewer';
    const t = render(<CalendarTab />);
    expect(tab(t)).toHaveLength(0);
    expect(text(t)).not.toMatch(/period/i);
  });
  it('opens the tracker from the switch for an owner with it on', async () => {
    mockAuth.user = user({ gender: 'female', periodTrackerEnabled: true });
    const t = render(<CalendarTab />);
    expect(text(t)).not.toContain('Private to you');
    await press(t, 'Periods');
    expect(tab(t)).toHaveLength(1);
    expect(text(t)).toMatch(/Start period/i);
  });
});
