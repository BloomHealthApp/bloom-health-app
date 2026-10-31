// SVG-string rendering for the home-screen widget. The widget library cannot draw react-native-svg components, so the
// original Bloom artwork (components/mascotArt.tsx) is evaluated into a React element tree and serialised to an SVG string.
// No artwork is duplicated: if the mascot changes, the widget changes with it.
import type { ReactElement, ReactNode } from 'react';
import { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { MascotArt, mascotPalette } from '@/components/mascotArt';
import type { MascotMood } from '@/components/mascotTypes';
import { THEMES } from '@/theme/themes';
import type { ThemeName } from '@/types/api';

const TAGS = new Map<unknown, string>([
  [G, 'g'],
  [Path, 'path'],
  [Circle, 'circle'],
  [Ellipse, 'ellipse'],
  [Rect, 'rect'],
  [Line, 'line'],
]);

const SKIP_PROPS = new Set(['children', 'key', 'ref']);
const kebab = (k: string) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function nodeToSvg(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return esc(String(node));
  if (Array.isArray(node)) return node.map(nodeToSvg).join('');
  const el = node as ReactElement<Record<string, unknown>>;
  const tag = TAGS.get(el.type);
  const props = el.props ?? {};
  if (!tag) {
    // Fragment: render its children only. Anything else is an unsupported primitive and is a programming error.
    if (typeof el.type === 'symbol') return nodeToSvg(props.children as ReactNode);
    throw new Error('widget svg: unsupported element in mascot art');
  }
  const attrs = Object.entries(props)
    .filter(([k, v]) => !SKIP_PROPS.has(k) && v !== undefined && v !== null)
    .map(([k, v]) => ` ${kebab(k)}="${esc(String(v))}"`)
    .join('');
  const inner = nodeToSvg(props.children as ReactNode);
  return inner ? `<${tag}${attrs}>${inner}</${tag}>` : `<${tag}${attrs}/>`;
}

/** The mascot as a standalone square SVG string (200x200 viewBox) coloured for the given app theme. */
export function mascotSvg(mood: MascotMood, themeName: ThemeName): string {
  const palette = mascotPalette(THEMES[themeName].colors);
  const body = nodeToSvg(MascotArt({ mood, palette }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">${body}</svg>`;
}

const FLAME_D = 'M12 2 C13 7 18 9 18 15 C18 19 15 22 12 22 C9 22 6 19 6 15 C6 12 8 10 9 8 C10 10 11 10 11.5 9.5 C12 7 11.5 4 12 2Z';
const FLAME_INNER_D = 'M12 22 C10 22 8.5 20.5 8.5 18.5 C8.5 16.5 10.5 15.5 11 13.5 C13 15 15.5 16.5 15.5 18.5 C15.5 20.5 14 22 12 22Z';

/** Streak flame icon. */
export function flameSvg(color: string, inner = '#FFD54F'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="${FLAME_D}" fill="${color}"/><path d="${FLAME_INNER_D}" fill="${inner}"/></svg>`;
}

/** Circular progress ring (percent 0..100). Arc starts at 12 o'clock and runs clockwise. */
export function ringSvg(percent: number, track: string, color: string, size = 100, stroke = 11): string {
  const p = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const c = size / 2;
  const r = (size - stroke) / 2;
  const base = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>`;
  let arc = '';
  if (p >= 100) {
    arc = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"/>`;
  } else if (p > 0) {
    const a = (p / 100) * 2 * Math.PI;
    const x = +(c + r * Math.sin(a)).toFixed(3);
    const y = +(c - r * Math.cos(a)).toFixed(3);
    arc = `<path d="M${c} ${c - r} A${r} ${r} 0 ${p > 50 ? 1 : 0} 1 ${x} ${y}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${base}${arc}</svg>`;
}
