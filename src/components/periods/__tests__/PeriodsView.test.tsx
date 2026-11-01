import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { GenderPicker } from '@/components/GenderPicker';
import { StreakCard } from '@/components/StreakCard';
import { predict } from '@/lib/cycle';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { Period } from '@/types/api';
import { PeriodsView, type PeriodsViewProps } from '../PeriodsView';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }));
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    Easing: { inOut: () => undefined, quad: undefined },
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => false,
    useSharedValue: (v: number) => ({ value: v }),
    withRepeat: (v: unknown) => v,
    withSequence: (...v: unknown[]) => v[0],
    withTiming: (v: unknown) => v,
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const TODAY = '2026-10-17';
const per = (id: string, startDate: string, endDate: string | null, over: Partial<Period> = {}): Period => ({
  id, startDate, endDate, flow: 'medium', symptoms: [], mood: null, note: null, version: 1, updatedAt: '', deletedAt: null, ...over,
});
const regular = [per('a', '2026-07-01', '2026-07-05'), per('b', '2026-07-29', '2026-08-02'), per('c', '2026-08-26', '2026-08-30'), per('d', '2026-09-23', '2026-09-27')];

function render(el: React.ReactElement) {
  let t!: renderer.ReactTestRenderer;
  act(() => {
    t = renderer.create(<ThemeProvider>{el}</ThemeProvider>);
  });
  return t;
}
const press = (t: renderer.ReactTestRenderer, label: string) =>
  act(async () => {
    const n = t.root.findAll((x) => x.props.accessibilityLabel === label && typeof x.props.onPress === 'function' && !x.props.accessibilityState?.disabled)[0];
    if (!n) throw new Error(`no pressable "${label}"`);
    await n.props.onPress();
  });
const text = (t: renderer.ReactTestRenderer) => JSON.stringify(t.toJSON());
const has = (t: renderer.ReactTestRenderer, label: string) => t.root.findAll((x) => x.props.accessibilityLabel === label).length > 0;

function props(over: Partial<PeriodsViewProps> = {}): PeriodsViewProps {
  return {
    periods: regular,
    today: TODAY,
    onStart: jest.fn(async (d: string) => per('new', d, null)),
    onEnd: jest.fn(async () => {}),
    onSave: jest.fn(async () => {}),
    onDelete: jest.fn(async () => {}),
    ...over,
  };
}

describe('PeriodsView', () => {
  it('shows the privacy note, disclaimer, estimate, stats and history', () => {
    const t = render(<PeriodsView {...props()} />);
    const s = text(t);
    expect(s).toContain('Private to you');
    expect(s).toContain('Estimates only, not medical advice.');
    expect(s).toContain('Next period ~Oct 21');
    expect(s).toContain('Average cycle');
    expect(s).toContain('28 days');
    expect(s).toContain('Sep 23 – Sep 27');
    expect(has(t, 'Start period')).toBe(true);
    expect(has(t, 'End period')).toBe(false);
  });

  it('marks period days and the predicted window on the calendar with accessible labels', () => {
    const t = render(<PeriodsView {...props({ periods: [...regular.slice(0, 3), per('d', '2026-10-15', null)], today: TODAY })} />);
    expect(has(t, 'Oct 16, period day')).toBe(true);
    expect(has(t, 'Oct 20, in the estimated window for the next period')).toBe(false); // ongoing: no shading
    const t2 = render(<PeriodsView {...props({ today: '2026-10-20' })} />);
    expect(has(t2, 'Oct 21, in the estimated window for the next period')).toBe(true);
  });

  it('Start period logs today and opens the editor for the new period', async () => {
    const p = props();
    const t = render(<PeriodsView {...p} />);
    await press(t, 'Start period');
    expect(p.onStart).toHaveBeenCalledWith(TODAY);
    expect(text(t)).toContain('Edit period');
    expect(has(t, 'Flow: Heavy')).toBe(true);
  });

  it('shows End period for an ongoing period and ends it today', async () => {
    const ongoing = per('o', '2026-10-15', null);
    const p = props({ periods: [...regular, ongoing] });
    const t = render(<PeriodsView {...p} />);
    expect(text(t)).toContain('Day 3 of period');
    expect(has(t, 'Start period')).toBe(false);
    await press(t, 'End period');
    expect(p.onEnd).toHaveBeenCalledWith(ongoing, TODAY);
  });

  it('editing: flow, symptoms from the allowlist, mood and note are saved with the period', async () => {
    const p = props();
    const t = render(<PeriodsView {...p} />);
    await press(t, 'Log a past period');
    await press(t, 'Flow: Heavy');
    await press(t, 'Symptoms: Cramps');
    await press(t, 'Symptoms: Mood swings');
    await press(t, 'Mood: Calm');
    await press(t, 'Mood: Calm'); // toggles off again
    await press(t, 'Mood: Sad');
    act(() => {
      t.root.findByProps({ accessibilityLabel: 'Note' }).props.onChangeText('slept badly');
    });
    await press(t, 'Save');
    expect(p.onSave).toHaveBeenCalledWith(
      { startDate: TODAY, endDate: null, flow: 'heavy', symptoms: ['cramps', 'mood_swings'], mood: 'sad', note: 'slept badly' },
      undefined,
    );
  });

  it('offers exactly the allowlisted symptoms and moods', () => {
    const t = render(<PeriodsView {...props()} />);
    const open = async () => press(t, 'Log a past period');
    return open().then(() => {
      const labels = t.root.findAll((x) => typeof x.props.accessibilityLabel === 'string' && /^(Symptoms|Mood|Flow): /.test(x.props.accessibilityLabel) && typeof x.props.onPress === 'function').map((x) => x.props.accessibilityLabel as string);
      const uniq = [...new Set(labels)];
      expect(uniq.filter((l) => l.startsWith('Symptoms')).map((l) => l.slice(10))).toEqual(['Cramps', 'Headache', 'Bloating', 'Fatigue', 'Mood swings', 'Backache', 'Acne', 'Nausea', 'Cravings', 'Tender breasts']);
      expect(uniq.filter((l) => l.startsWith('Mood')).map((l) => l.slice(6))).toEqual(['Happy', 'Calm', 'Sad', 'Irritable', 'Anxious']);
      expect(uniq.filter((l) => l.startsWith('Flow')).map((l) => l.slice(6))).toEqual(['Light', 'Medium', 'Heavy']);
    });
  });

  it('blocks saving an overlapping period and explains why', async () => {
    const p = props();
    const t = render(<PeriodsView {...p} />);
    await press(t, 'Log a past period');
    // an ongoing period starting Sep 25 would run through Sep 23-27, which is already logged
    for (let i = 0; i < 22; i++) await press(t, 'Started, one day earlier');
    expect(text(t)).toContain('overlaps another logged period');
    const save = t.root.findAll((x) => x.props.accessibilityLabel === 'Save' && typeof x.props.onPress === 'function')[0];
    expect(save.props.disabled || save.props.accessibilityState?.disabled).toBeTruthy();
    expect(p.onSave).not.toHaveBeenCalled();
  });

  it('delete asks for confirmation first', async () => {
    const p = props();
    const t = render(<PeriodsView {...p} />);
    await press(t, 'Delete period starting Sep 23');
    expect(p.onDelete).not.toHaveBeenCalled();
    expect(text(t)).toContain('Delete this period?');
    await press(t, 'Delete');
    expect(p.onDelete).toHaveBeenCalledWith(regular[3]);
  });

  it('save errors surface in an alert banner', async () => {
    const p = props({ onSave: jest.fn(async () => { throw new Error('Another period is still ongoing. End it first.'); }) });
    const t = render(<PeriodsView {...p} />);
    await press(t, 'Log a past period');
    await press(t, 'Save');
    expect(text(t)).toContain('Another period is still ongoing');
  });

  it('empty and loading states', () => {
    expect(text(render(<PeriodsView {...props({ periods: [] })} />))).toContain('Nothing logged yet');
    expect(text(render(<PeriodsView {...props({ periods: [] })} />))).toContain('Start tracking');
    expect(text(render(<PeriodsView {...props({ loading: true })} />))).toContain('Loading your tracker');
  });

  it('with fewer than two cycles it asks to log more cycles instead of estimating', () => {
    const t = render(<PeriodsView {...props({ periods: regular.slice(0, 2) })} />);
    expect(text(t)).toContain('Log a few cycles to see an estimate');
    expect(text(t)).not.toContain('Next period ~');
  });

  it('every touch target in the tracker is at least 44pt', async () => {
    const t = render(<PeriodsView {...props()} />);
    await press(t, 'Log a past period');
    const pressables = t.root.findAll((x) => typeof x.props.onPress === 'function' && x.props.accessibilityRole && x.props.style);
    expect(pressables.length).toBeGreaterThan(20);
    for (const n of pressables) {
      const style = typeof n.props.style === 'function' ? n.props.style({ pressed: false }) : n.props.style;
      const flat = Array.isArray(style) ? Object.assign({}, ...style.flat(3).filter(Boolean)) : style;
      if (flat.minHeight !== undefined) expect(flat.minHeight).toBeGreaterThanOrEqual(44);
    }
  });

  it('reminder switch reports changes and shows its status note', async () => {
    const onChange = jest.fn();
    const t = render(<PeriodsView {...props({ reminder: { enabled: true, note: 'Reminder set for two days before the estimate.', onChange } })} />);
    expect(text(t)).toContain('Reminder set for two days');
    act(() => {
      t.root.findByProps({ accessibilityLabel: 'Remind me before my period may start', value: true }).props.onValueChange(false);
    });
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('StreakCard, GenderPicker', () => {
  it('streak card shows the rest-day note and includes it in its accessible label', () => {
    const t = render(<StreakCard current={3} longest={5} restNote="Sundays don't break your streak" />);
    expect(text(t)).toContain("Sundays don't break your streak");
    expect(t.root.findAll((x) => typeof x.props.accessibilityLabel === 'string' && x.props.accessibilityLabel.includes("Sundays don't break your streak.")).length).toBeGreaterThan(0);
    expect(text(render(<StreakCard current={3} longest={5} />))).not.toContain('break your streak');
  });

  it('gender picker offers the four options, and tapping the selected one clears it', async () => {
    const onChange = jest.fn();
    const t = render(<GenderPicker value="female" onChange={onChange} />);
    expect(text(t)).toContain('Prefer not to say');
    await press(t, 'Male');
    expect(onChange).toHaveBeenLastCalledWith('male');
    await press(t, 'Female');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
