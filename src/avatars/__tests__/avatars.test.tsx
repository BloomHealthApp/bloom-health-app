import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { Avatar } from '../Avatar';
import { avatarArt } from '../AvatarArt';
import { AvatarPicker } from '../AvatarPicker';
import { AVATAR_IDS, AVATAR_LABELS, DEFAULT_AVATAR_ID, avatarLabel, isAvatarId } from '../avatarCatalog';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }));

function render(el: React.ReactElement) {
  let t!: renderer.ReactTestRenderer;
  act(() => {
    t = renderer.create(<ThemeProvider>{el}</ThemeProvider>);
  });
  return t;
}

describe('avatar catalog', () => {
  it('has the nine allowlisted ids with labels and a default', () => {
    expect(AVATAR_IDS).toEqual(['bubu-01', 'bubu-02', 'bubu-03', 'bubu-04', 'bubu-05', 'bubu-06', 'bubu-07', 'bubu-08', 'bubu-09']);
    expect(Object.keys(AVATAR_LABELS)).toHaveLength(9);
    expect(DEFAULT_AVATAR_ID).toBe('bubu-01');
  });
  it('isAvatarId accepts only allowlisted ids', () => {
    for (const id of AVATAR_IDS) expect(isAvatarId(id)).toBe(true);
    for (const bad of ['bubu-00', 'bubu-10', 'evil', '', null, undefined, 1]) expect(isAvatarId(bad)).toBe(false);
    expect(avatarLabel('bubu-03')).toBe('Candy Stick');
    expect(avatarLabel('nope')).toBe('Bloom');
  });
});

describe('Avatar', () => {
  it.each([...AVATAR_IDS])('renders %s at the smallest and largest size with a label', (id) => {
    for (const size of [32, 120]) {
      const json = JSON.stringify(render(<Avatar id={id} size={size} />).toJSON());
      expect(json).toContain(`${AVATAR_LABELS[id]} avatar`);
    }
  });
  it.each([null, undefined, 'evil', 'bubu-99'])('falls back to the neutral face for %p', (id) => {
    const json = JSON.stringify(render(<Avatar id={id} />).toJSON());
    expect(json).toContain('Default avatar');
  });
  it('uses "<name>\'s avatar" when a name is given and can be decorative', () => {
    expect(JSON.stringify(render(<Avatar id="bubu-02" name="Anu" />).toJSON())).toContain("Anu's avatar");
    const t = render(<Avatar id="bubu-02" name="Anu" decorative />);
    expect(JSON.stringify(t.toJSON())).not.toContain("Anu's avatar");
  });
  it('clamps the diameter to 32-120', () => {
    const style = (size: number) => (render(<Avatar id="bubu-01" size={size} />).toJSON() as unknown as { props: { style: { width: number; borderRadius: number } } }).props.style;
    expect(style(10).width).toBe(32);
    expect(style(500).width).toBe(120);
    expect(style(64)).toMatchObject({ width: 64, borderRadius: 32 });
  });
  it('draws distinct art for every id and for the fallback', () => {
    const arts = new Set([...AVATAR_IDS, null].map((id) => JSON.stringify(avatarArt(id))));
    expect(arts.size).toBe(10);
  });
});

describe('AvatarPicker', () => {
  const radios = (t: renderer.ReactTestRenderer) => t.root.findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');

  it('shows nine options with labels and marks only the selected one', () => {
    const t = render(<AvatarPicker value="bubu-04" onChange={() => {}} />);
    const r = radios(t);
    expect(r).toHaveLength(9);
    expect(r.map((n) => n.props.accessibilityLabel)).toEqual(AVATAR_IDS.map((id) => `${AVATAR_LABELS[id]} avatar`));
    expect(r.map((n) => n.props.accessibilityState.selected)).toEqual(AVATAR_IDS.map((id) => id === 'bubu-04'));
  });
  it('selects nothing for a null or unknown value', () => {
    for (const v of [null, 'evil']) {
      const sel = radios(render(<AvatarPicker value={v} onChange={() => {}} />)).filter((n) => n.props.accessibilityState.selected);
      expect(sel).toHaveLength(0);
    }
  });
  it('calls onChange with the tapped id', () => {
    const onChange = jest.fn();
    const t = render(<AvatarPicker value="bubu-01" onChange={onChange} />);
    act(() => radios(t)[6].props.onPress());
    expect(onChange).toHaveBeenCalledWith('bubu-07');
  });
  it('keeps every touch target at least 44pt', () => {
    const t = render(<AvatarPicker value={null} onChange={() => {}} size={32} />);
    for (const n of radios(t)) {
      const style = Array.isArray(n.props.style) ? Object.assign({}, ...n.props.style) : n.props.style;
      expect(style.minWidth).toBeGreaterThanOrEqual(44);
      expect(style.minHeight).toBeGreaterThanOrEqual(44);
    }
  });
  it('ignores presses when disabled', () => {
    const t = render(<AvatarPicker value={null} onChange={() => {}} disabled />);
    expect(radios(t).every((n) => n.props.disabled)).toBe(true);
  });
});
