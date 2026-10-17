import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { BubuMascot } from '../BubuMascot';
import { BubuMascotStatic } from '../BubuMascotStatic';
import { MASCOT_MOODS } from '../mascotTypes';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }));

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
