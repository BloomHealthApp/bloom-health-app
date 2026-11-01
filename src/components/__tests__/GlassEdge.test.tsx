import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { THEMES } from '@/theme/themes';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { GlassEdge } from '../GlassEdge';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, setItem: async () => {} }));

async function mount() {
  let t!: renderer.ReactTestRenderer;
  await act(async () => {
    t = renderer.create(<ThemeProvider><GlassEdge radius={999} /></ThemeProvider>);
  });
  const host = t.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'glass-edge')[0];
  const border = () => t.root.findAll((n) => n.props.testID === 'glass-edge-border' && n.props.stroke !== undefined);
  return { host, border };
}

describe('GlassEdge', () => {
  it('ignores touches and draws nothing before layout', async () => {
    const { host, border } = await mount();
    expect(host.props.pointerEvents).toBe('none');
    expect(border()).toHaveLength(0);
  });
  it('draws one border after layout, with a radius no bigger than the shape allows', async () => {
    const { host, border } = await mount();
    await act(async () => host.props.onLayout({ nativeEvent: { layout: { width: 200, height: 40 } } }));
    expect(border().length).toBeGreaterThan(0);
    expect(new Set(border().map((b) => b.props.rx))).toEqual(new Set([19.375]));
  });
  it('has edge colours for every theme, light and dark', () => {
    for (const t of Object.values(THEMES)) {
      for (const c of [t.colors, t.darkColors]) {
        for (const v of [c.edgeHighlight, c.edgeShade, c.edgeGlow]) expect(v).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });
});
