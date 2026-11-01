import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { HABIT_ICON_CHOICES } from '@/lib/habitIcon';
import { IconPicker } from '../IconPicker';
import { iconArt, ICON_NAMES } from '../iconArt';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, setItem: async () => {} }));

const ALLOWED = new Set<unknown>([Circle, Ellipse, G, Path, Rect]);
const types = (n: React.ReactNode): unknown[] => {
  if (Array.isArray(n)) return n.flatMap(types);
  if (!React.isValidElement(n)) return [];
  return [n.type, ...types((n.props as { children?: React.ReactNode }).children)];
};

describe('icon art', () => {
  it('draws something different for every icon using only simple shapes', () => {
    const art = ICON_NAMES.map((n) => iconArt(n, '#123456'));
    expect(new Set(art.map((a) => JSON.stringify(a))).size).toBe(ICON_NAMES.length);
    for (const a of art) for (const t of types(a)) expect(ALLOWED.has(t)).toBe(true);
  });
});

describe('IconPicker', () => {
  const radios = (t: renderer.ReactTestRenderer) => t.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'radio');
  async function mount(value: string, onChange = jest.fn()) {
    let t!: renderer.ReactTestRenderer;
    await act(async () => {
      t = renderer.create(<ThemeProvider><IconPicker value={value} onChange={onChange} /></ThemeProvider>);
    });
    return t;
  }
  it('marks the saved icon and reports a new choice by name', async () => {
    const onChange = jest.fn();
    const t = await mount('moon', onChange);
    expect(radios(t)).toHaveLength(HABIT_ICON_CHOICES.length);
    expect(radios(t).filter((r) => r.props.accessibilityState.selected).map((r) => r.props.accessibilityLabel)).toEqual(['Moon']);
    const pressable = t.root.findAll((n) => n.props.accessibilityLabel === 'Water' && typeof n.props.onPress === 'function')[0];
    await act(async () => pressable.props.onPress());
    expect(onChange).toHaveBeenCalledWith('droplet');
  });
  it('keeps an older emoji selectable until another icon is chosen', async () => {
    const t = await mount('🧘');
    expect(radios(t)).toHaveLength(HABIT_ICON_CHOICES.length + 1);
    expect(radios(t)[0].props.accessibilityLabel).toBe('Current emoji');
    expect(radios(t)[0].props.accessibilityState.selected).toBe(true);
  });
});
