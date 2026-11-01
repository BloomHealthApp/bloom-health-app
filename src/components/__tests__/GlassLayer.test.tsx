import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { THEMES } from '@/theme/themes';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { GlassLayer, glassLayers, glassShadow } from '../GlassLayer';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, setItem: async () => {} }));

async function mount() {
  let t!: renderer.ReactTestRenderer;
  await act(async () => {
    t = renderer.create(<ThemeProvider><GlassLayer radius={999} /></ThemeProvider>);
  });
  const host = t.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'glass-layer')[0];
  const border = () => t.root.findAll((n) => n.props.testID === 'glass-layer-shade' && n.props.fill !== undefined);
  return { host, border };
}

describe('GlassLayer', () => {
  it('ignores touches and draws nothing before layout', async () => {
    const { host, border } = await mount();
    expect(host.props.pointerEvents).toBe('none');
    expect(border()).toHaveLength(0);
  });
  it('draws after layout, with a radius no bigger than the shape allows', async () => {
    const { host, border } = await mount();
    await act(async () => host.props.onLayout({ nativeEvent: { layout: { width: 200, height: 40 } } }));
    expect(border().length).toBeGreaterThan(0);
    expect(new Set(border().map((b) => b.props.rx))).toEqual(new Set([20]));
  });
  it('has a glow colour for every theme, light and dark', () => {
    for (const t of Object.values(THEMES)) {
      for (const c of [t.colors, t.darkColors]) {
        for (const v of [c.glassGlow]) expect(v).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });
  it('never draws a border or rim', () => {
    const strokes = (n: React.ReactNode): number => {
      if (Array.isArray(n)) return n.reduce((sum: number, x) => sum + strokes(x), 0);
      if (!React.isValidElement(n)) return 0;
      const p = n.props as { stroke?: string; children?: React.ReactNode };
      return (p.stroke ? 1 : 0) + strokes(p.children);
    };
    for (const onFill of [false, true]) expect(strokes(glassLayers({ width: 200, height: 80, radius: 26, colors: THEMES.forestTrail.colors, isDark: false, onFill }))).toBe(0);
  });
  it('gives raised surfaces a stronger shadow in dark mode', () => {
    expect(glassShadow(true)).toContain('0.45');
    expect(glassShadow(false)).toContain('0.14');
  });
});
