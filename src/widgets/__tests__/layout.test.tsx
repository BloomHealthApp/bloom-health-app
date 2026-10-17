import type { ReactElement, ReactNode } from 'react';
import { THEMES } from '@/theme/themes';
import type { ThemeName } from '@/types/api';
import { MediumWidget, renderBubuWidget, SmallWidget, WIDGET_MEDIUM, WIDGET_SMALL } from '../BubuWidgets';
import { buildSnapshot, signedOutSnapshot, unopenedSnapshot, type WidgetSnapshot } from '../widgetData';

// The library's JS builders do not need the native module, but its index imports it eagerly.
jest.mock('react-native-android-widget/lib/commonjs/NativeAndroidWidget', () => ({ __esModule: true, default: {} }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, setItem: async () => {} }));

type El = ReactElement<{ children?: ReactNode; text?: string; svg?: string; clickAction?: string }>;
function walk(node: ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) node.forEach((n) => walk(n, out));
  else if (node && typeof node === 'object') {
    out.push(node as El);
    walk((node as El).props.children, out);
  }
  return out;
}
const texts = (e: ReactNode) => walk(e).map((x) => x.props.text).filter((t): t is string => typeof t === 'string');
const svgs = (e: ReactNode) => walk(e).map((x) => x.props.svg).filter((t): t is string => typeof t === 'string');

const ready = (theme: ThemeName = 'cottonCandy'): WidgetSnapshot =>
  buildSnapshot({
    role: 'owner',
    theme,
    today: '2026-03-10',
    timezone: 'UTC',
    todayScore: { eligible: 5, completed: 3, completionPercent: 60, successful: false, neutral: false },
    currentStreak: 7,
    longestStreak: 21,
  });

describe('widget layouts', () => {
  it('small shows mascot + current streak and opens the app on tap', () => {
    const el = SmallWidget({ snapshot: ready() });
    expect(el.props.clickAction).toBe('OPEN_APP');
    expect(texts(el)).toEqual(['7', 'day streak']);
    expect(svgs(el).length).toBe(2); // mascot + flame
  });

  it('medium shows streak, longest, counts, percent and message', () => {
    const el = MediumWidget({ snapshot: ready() });
    expect(el.props.clickAction).toBe('OPEN_APP');
    const t = texts(el);
    expect(t).toContain('7 day streak');
    expect(t).toContain('Longest: 21 days');
    expect(t).toContain('3 of 5 habits done');
    expect(t).toContain('60%');
    expect(t).toContain('Over halfway there. Keep blooming!');
    expect(svgs(el).length).toBe(3); // mascot + flame + ring
  });

  it('singular streak wording', () => {
    const s = { ...ready(), currentStreak: 1 };
    expect(texts(MediumWidget({ snapshot: s }))).toContain('1 day streak');
  });

  it('signed-out, never-opened and no-habit states show a sensible message', () => {
    for (const W of [SmallWidget, MediumWidget]) {
      expect(texts(W({ snapshot: signedOutSnapshot() }))).toContain('Open Bubu Bloom to sign in');
      expect(texts(W({ snapshot: unopenedSnapshot() }))).toContain('Open Bubu Bloom to get started');
    }
    const none = buildSnapshot({ role: 'owner', theme: 'mintPeach', today: '2026-03-10', timezone: 'UTC', todayScore: { eligible: 0, completed: 0, completionPercent: 0, successful: false, neutral: true }, currentStreak: 2, longestStreak: 2 });
    expect(texts(MediumWidget({ snapshot: none }))).toContain('No habits scheduled today');
  });

  it('never emits undefined / NaN text or svg, for any theme and state', () => {
    for (const name of Object.keys(THEMES) as ThemeName[]) {
      for (const s of [ready(name), signedOutSnapshot(name), unopenedSnapshot(name)]) {
        for (const w of [WIDGET_SMALL, WIDGET_MEDIUM]) {
          const el = renderBubuWidget(w, s, { width: 180, height: 110 });
          for (const t of [...texts(el), ...svgs(el)]) expect(t).not.toMatch(/undefined|NaN|\[object/);
        }
      }
    }
  });

  it('picks the layout by widget name', () => {
    expect(renderBubuWidget(WIDGET_MEDIUM, ready()).type).toBe(MediumWidget);
    expect(renderBubuWidget(WIDGET_SMALL, ready()).type).toBe(SmallWidget);
    expect(renderBubuWidget('Unknown', ready()).type).toBe(SmallWidget);
  });
});
