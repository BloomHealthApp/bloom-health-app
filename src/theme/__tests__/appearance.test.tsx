import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ThemePicker } from '@/components/ThemePicker';
import { resolveTheme, THEME_LIST, THEMES } from '../themes';
import { ThemeProvider, useTheme } from '../ThemeProvider';

const mockStore = new Map<string, string>();
let mockScheme: 'light' | 'dark' = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: () => mockScheme }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (k: string) => mockStore.get(k) ?? null,
  setItem: async (k: string, v: string) => void mockStore.set(k, v),
}));

const lum = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

let ctx: ReturnType<typeof useTheme>;
const capture = (v: typeof ctx) => {
  ctx = v;
};
function Capture({ onValue }: { onValue: typeof capture }) {
  onValue(useTheme());
  return null;
}
async function mount() {
  await act(async () => {
    renderer.create(<ThemeProvider><Capture onValue={capture} /></ThemeProvider>);
  });
}

beforeEach(() => {
  mockStore.clear();
  mockScheme = 'light';
});

describe('dark palettes', () => {
  it.each(Object.values(THEMES).map((t) => [t.label, t.darkColors] as const))('%s is readable', (_label, c) => {
    expect(contrast(c.text, c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.textMuted, c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.textMuted, c.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.accent, c.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.onDanger, c.danger)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.danger, c.dangerTint)).toBeGreaterThanOrEqual(4.5);
    expect(lum(c.bg)).toBeLessThan(0.05);
  });
  it('resolveTheme picks the palette for the appearance', () => {
    expect(resolveTheme('midnightNavy', true).colors.bg).toBe('#0C1524');
    expect(resolveTheme('midnightNavy', false).colors.bg).toBe('#E9EEF6');
  });
});

describe('appearance setting', () => {
  it('switches every theme to dark and remembers the choice', async () => {
    await mount();
    await act(async () => ctx.setAppearance('dark'));
    expect(ctx.theme.isDark).toBe(true);
    expect(mockStore.get('bubu.appearance')).toBe('dark');
    for (const t of THEME_LIST) {
      await act(async () => ctx.setThemeName(t.name));
      expect(ctx.theme.colors).toBe(t.darkColors);
    }
  });
  it('restores a saved choice', async () => {
    mockStore.set('bubu.appearance', 'dark');
    await mount();
    expect(ctx.appearance).toBe('dark');
    expect(ctx.theme.isDark).toBe(true);
  });
  it('follows the system when set to System', async () => {
    mockScheme = 'dark';
    await mount();
    expect(ctx.appearance).toBe('system');
    expect(ctx.theme.isDark).toBe(true);
  });
});

describe('theme picker', () => {
  const radios = (t: renderer.ReactTestRenderer) => t.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'radio' && String(n.props.accessibilityLabel).endsWith('theme'));
  it('offers one square per theme, with Sunset Ember in place of Mint Peach', async () => {
    let t!: renderer.ReactTestRenderer;
    await act(async () => {
      t = renderer.create(<ThemeProvider><ThemePicker /></ThemeProvider>);
    });
    expect(radios(t).map((n) => n.props.accessibilityLabel)).toEqual(['Forest Trail theme', 'Midnight Navy theme', 'Cotton Candy theme', 'Lavender Dream theme', 'Sunset Ember theme', 'Graphite Grey theme']);
    expect(radios(t).map((n) => n.props.accessibilityState.selected)).toEqual([true, false, false, false, false, false]);
    for (const square of radios(t)) expect(square.findAll((n) => typeof n.type === 'string' && n.props.testID === 'theme-color')).toHaveLength(4);
  });
  it('still shows Mint Peach for an account already using it', async () => {
    mockStore.set('bubu.theme', 'mintPeach');
    await mount();
    expect(ctx.theme.name).toBe('mintPeach');
  });
  it.each(['sunsetEmber', 'graphiteGrey'] as const)('keeps %s readable in light mode', (name) => {
    const c = THEMES[name].colors;
    expect(contrast(c.text, c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.textMuted, c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.accent, c.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
