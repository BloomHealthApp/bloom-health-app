import { MASCOT_MOODS } from '@/components/mascotTypes';
import { THEMES } from '@/theme/themes';
import type { ThemeName } from '@/types/api';
import { flameSvg, mascotSvg, ringSvg } from '../svg';

/** Minimal well-formedness check: balanced, properly nested tags and quoted attributes. */
function expectWellFormed(svg: string) {
  expect(svg.startsWith('<svg ')).toBe(true);
  expect(svg.endsWith('</svg>')).toBe(true);
  const stack: string[] = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g;
  let consumed = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    expect(m.index).toBe(consumed); // no stray text between tags
    consumed = re.lastIndex;
    const [, close, tag, , selfClose] = m;
    if (close) expect(stack.pop()).toBe(tag);
    else if (!selfClose) stack.push(tag);
  }
  expect(consumed).toBe(svg.length);
  expect(stack).toEqual([]);
}
const expectClean = (svg: string) => expect(svg).not.toMatch(/undefined|NaN|null|\[object|Infinity/);

describe('mascotSvg', () => {
  const themes = Object.keys(THEMES) as ThemeName[];
  for (const mood of MASCOT_MOODS) {
    it(`renders a valid svg for mood ${mood} in every theme`, () => {
      for (const t of themes) {
        const svg = mascotSvg(mood, t);
        expectWellFormed(svg);
        expectClean(svg);
        expect(svg).toContain('viewBox="0 0 200 200"');
        expect(svg).toContain('<path');
      }
    });
  }
  it('uses the theme palette and the original ink outline', () => {
    expect(mascotSvg('happy', 'cottonCandy')).toContain('#5B3A3A');
    expect(mascotSvg('loved', 'cottonCandy')).toContain(THEMES.cottonCandy.colors.primary);
    expect(mascotSvg('loved', 'mintPeach')).toContain(THEMES.mintPeach.colors.primary);
    expect(mascotSvg('loved', 'mintPeach')).not.toContain(THEMES.cottonCandy.colors.primary);
  });
  it('converts camelCase props to svg attributes', () => {
    const svg = mascotSvg('happy', 'cottonCandy');
    expect(svg).toContain('stroke-width="');
    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).not.toMatch(/strokeWidth|strokeLinecap/);
  });
});

describe('ringSvg / flameSvg', () => {
  it('draws track only at 0, an arc at 50, and a full circle at 100', () => {
    expect(ringSvg(0, '#eee', '#f00')).not.toContain('<path');
    expect(ringSvg(50, '#eee', '#f00')).toContain('<path');
    expect((ringSvg(100, '#eee', '#f00').match(/<circle/g) ?? []).length).toBe(2);
  });
  it('uses the large-arc flag past 50%', () => {
    expect(ringSvg(75, '#eee', '#f00')).toMatch(/A[\d.]+ [\d.]+ 0 1 1/);
    expect(ringSvg(25, '#eee', '#f00')).toMatch(/A[\d.]+ [\d.]+ 0 0 1/);
  });
  it('is valid and clean for odd input', () => {
    for (const p of [-5, 0, 0.1, 33, 99.9, 100, 250, NaN]) {
      const s = ringSvg(p, '#E9E2FF', '#6B58A6');
      expectWellFormed(s);
      expectClean(s);
    }
    expectWellFormed(flameSvg('#C0407F'));
    expectClean(flameSvg('#C0407F'));
  });
});
