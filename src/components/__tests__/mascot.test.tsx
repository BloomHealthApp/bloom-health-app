import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { BubuMascot } from '../BubuMascot';
import { BubuMascotStatic } from '../BubuMascotStatic';
import { MASCOT_MOODS } from '../mascotTypes';

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

function render(el: React.ReactElement) {
  let t!: renderer.ReactTestRenderer;
  act(() => {
    t = renderer.create(<ThemeProvider>{el}</ThemeProvider>);
  });
  return t;
}

describe('Bubu mascot moods', () => {
  it('lists all ten moods', () => {
    expect(MASCOT_MOODS).toHaveLength(10);
  });

  it.each(MASCOT_MOODS)('renders the static %s mood at several sizes', (mood) => {
    for (const size of [80, 120, 200]) expect(render(<BubuMascotStatic mood={mood} size={size} />).toJSON()).toBeTruthy();
  });

  it.each(MASCOT_MOODS)('renders %s through BubuMascot with an accessibility label', (mood) => {
    const json = JSON.stringify(render(<BubuMascot mood={mood} animated={false} />).toJSON());
    expect(json).toContain('Bubu the bunny-bear');
  });

  it('honours a custom accessibility label', () => {
    expect(JSON.stringify(render(<BubuMascot mood="hydrate" animated={false} accessibilityLabel="Drink up" />).toJSON())).toContain('Drink up');
  });
});
