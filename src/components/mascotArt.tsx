import React from 'react';
import { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import type { ThemeColors } from '@/theme/themes';
import type { MascotMood } from './mascotTypes';

/** Original "Bloom" mascot in a 200x200 viewBox. Cheeks, props and accents follow the active theme. */
export const INK = '#5B3A3A';
export const CREAM = '#FFF7EC';
export const PEACH = '#FFC9B8';
export const GOLD = '#F6C453';
const WATER = '#BFE6F5';
const SW = 4; // outline width
const BORDER = 7; // white sticker border thickness

export interface MascotPalette {
  cheek: string;
  primary: string;
  soft: string;
  accent: string;
  leaf: string;
  cheekOpacity: number;
}

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('');
}

export function mascotPalette(c: ThemeColors): MascotPalette {
  return {
    cheek: mixHex(c.primary, '#FF9DB5', 0.72),
    primary: c.primary,
    soft: c.secondary,
    accent: c.accent,
    leaf: c.success,
    cheekOpacity: 0.62,
  };
}

/** colour = real artwork; halo/shadow = flat silhouettes behind it that form the white border and drop shadow */
export type Layer = { kind: 'color' } | { kind: 'flat'; color: string; grow: number };
type Geom =
  | { t: 'path'; d: string }
  | { t: 'ell'; cx: number; cy: number; rx: number; ry: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; r: number; rot?: number };

/** the real-artwork layer (outlined, filled); the avatars only ever draw this one */
export const COLOR_LAYER: Layer = { kind: 'color' };
const isColor = (L: Layer) => L.kind === 'color';

export function shape(L: Layer, key: string, g: Geom, fill: string) {
  const common = isColor(L)
    ? { fill, stroke: INK, strokeWidth: SW, strokeLinejoin: 'round' as const }
    : { fill: L.kind === 'flat' ? L.color : fill, stroke: L.kind === 'flat' ? L.color : fill, strokeWidth: SW + 2 * BORDER + (L.kind === 'flat' ? L.grow : 0), strokeLinejoin: 'round' as const };
  if (g.t === 'path') return <Path key={key} d={g.d} {...common} />;
  if (g.t === 'ell') return <Ellipse key={key} cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} {...common} />;
  const transform = g.rot ? `rotate(${g.rot} ${g.x + g.w / 2} ${g.y + g.h / 2})` : undefined;
  return <Rect key={key} x={g.x} y={g.y} width={g.w} height={g.h} rx={g.r} transform={transform} {...common} />;
}

/** stubby capsule limb from (x1,y1) to (x2,y2) */
export function limb(L: Layer, key: string, x1: number, y1: number, x2: number, y2: number, w = 14, fill = CREAM) {
  if (isColor(L)) {
    return (
      <G key={key}>
        <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={w + 2 * SW} strokeLinecap="round" />
        <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={fill} strokeWidth={w} strokeLinecap="round" />
      </G>
    );
  }
  const color = L.kind === 'flat' ? L.color : '#fff';
  const grow = L.kind === 'flat' ? L.grow : 0;
  return <Line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={w + 2 * SW + 2 * BORDER + grow} strokeLinecap="round" />;
}

export const sparkle = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy - s} L${cx + s * 0.28} ${cy - s * 0.28} L${cx + s} ${cy} L${cx + s * 0.28} ${cy + s * 0.28} L${cx} ${cy + s} L${cx - s * 0.28} ${cy + s * 0.28} L${cx - s} ${cy} L${cx - s * 0.28} ${cy - s * 0.28}Z`;
export const heart = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + s * 0.9} C${cx - s * 1.7} ${cy - s * 0.2} ${cx - s * 0.7} ${cy - s * 1.4} ${cx} ${cy - s * 0.4} C${cx + s * 0.7} ${cy - s * 1.4} ${cx + s * 1.7} ${cy - s * 0.2} ${cx} ${cy + s * 0.9}Z`;

const BODY_D = 'M100 46 C142 46 170 72 171 110 C172 150 150 177 100 177 C50 177 28 150 29 110 C30 72 58 46 100 46Z';
const EAR_L = 'M44 58 C34 40 40 16 56 16 C70 16 76 38 72 54Z';
const EAR_R = 'M156 58 C166 40 160 16 144 16 C130 16 124 38 128 54Z';
const EAR_IN_L = 'M50 52 C44 40 47 28 56 28 C64 28 67 40 65 50Z';
const EAR_IN_R = 'M150 52 C156 40 153 28 144 28 C136 28 133 40 135 50Z';

type Arm = [number, number, number, number];
interface Pose {
  /** arms drawn behind the body */
  back?: Arm[];
  /** arms drawn over the body */
  front?: Arm[];
}

const POSES: Record<MascotMood, Pose> = {
  happy: { back: [[48, 128, 24, 148], [152, 112, 180, 86]] },
  sleepy: { back: [[48, 128, 26, 150], [152, 128, 174, 150]] },
  cheer: { back: [[48, 112, 22, 70], [152, 112, 178, 70]] },
  celebrating: { back: [[48, 112, 22, 66], [152, 112, 178, 66]] },
  sad: { back: [[48, 130, 28, 152], [152, 130, 172, 152]] },
  eating: { back: [[48, 130, 26, 150]], front: [[166, 150, 156, 160]] },
  loved: { back: [[48, 130, 26, 150]], front: [[164, 146, 150, 156]] },
  hydrate: { back: [[48, 130, 26, 150]], front: [[166, 146, 152, 152]] },
  workout: { back: [[48, 130, 26, 150], [152, 116, 178, 100]] },
  thinking: { front: [[56, 152, 72, 158], [144, 152, 128, 158]] },
};

function props(L: Layer, mood: MascotMood, p: MascotPalette) {
  switch (mood) {
    case 'eating':
      return [
        shape(L, 'stick', { t: 'rect', x: 146, y: 158, w: 8, h: 18, r: 3, rot: 10 }, '#F2D6A2'),
        shape(L, 'pop', { t: 'rect', x: 130, y: 128, w: 30, h: 40, r: 13, rot: 10 }, p.soft),
        isColor(L) ? <Path key="pop-dip" d="M131 142 Q146 148 160 140 L160 148 Q146 156 133 150Z" fill={p.primary} opacity={0.9} /> : null,
        isColor(L) ? <Path key="pop-hi" d="M137 136 Q137 133 141 132" stroke="#fff" strokeWidth={3} strokeLinecap="round" fill="none" /> : null,
      ];
    case 'loved':
      return [
        <G key="flower">
          {isColor(L) ? <Line x1={142} y1={150} x2={136} y2={122} stroke={INK} strokeWidth={9} strokeLinecap="round" /> : null}
          {isColor(L) ? <Line x1={142} y1={150} x2={136} y2={122} stroke={p.leaf} strokeWidth={4} strokeLinecap="round" /> : null}
          {shape(L, 'f1', { t: 'ell', cx: 136, cy: 108, rx: 9, ry: 9 }, p.primary)}
          {shape(L, 'f2', { t: 'ell', cx: 124, cy: 118, rx: 9, ry: 9 }, p.primary)}
          {shape(L, 'f3', { t: 'ell', cx: 148, cy: 118, rx: 9, ry: 9 }, p.primary)}
          {shape(L, 'f4', { t: 'ell', cx: 129, cy: 130, rx: 9, ry: 9 }, p.primary)}
          {shape(L, 'f5', { t: 'ell', cx: 143, cy: 130, rx: 9, ry: 9 }, p.primary)}
          {isColor(L) ? <Circle cx={136} cy={120} r={7} fill={GOLD} stroke={INK} strokeWidth={3} /> : null}
        </G>,
      ];
    case 'hydrate':
      return [
        shape(L, 'cap', { t: 'rect', x: 140, y: 106, w: 20, h: 10, r: 4 }, p.primary),
        shape(L, 'bottle', { t: 'rect', x: 134, y: 114, w: 32, h: 60, r: 13 }, WATER),
        isColor(L) ? <Rect key="label" x={134} y={134} width={32} height={16} fill={p.soft} stroke={INK} strokeWidth={3} /> : null,
        isColor(L) ? <Path key="hi" d="M141 122 L141 128" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" /> : null,
        isColor(L) ? <Path key="drop" d="M178 100 q-6 9 0 13 q6 -4 0 -13Z" fill={WATER} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" /> : null,
      ];
    case 'workout':
      return [
        <G key="db">
          {shape(L, 'bar', { t: 'rect', x: 178, y: 72, w: 6, h: 28, r: 2 }, p.soft)}
          {shape(L, 'w1', { t: 'rect', x: 172, y: 64, w: 18, h: 10, r: 4 }, p.primary)}
          {shape(L, 'w2', { t: 'rect', x: 172, y: 96, w: 18, h: 10, r: 4 }, p.primary)}
        </G>,
        isColor(L) ? <Path key="band" d="M46 82 Q100 64 154 82" stroke={INK} strokeWidth={14} strokeLinecap="round" fill="none" /> : null,
        isColor(L) ? <Path key="band2" d="M46 82 Q100 64 154 82" stroke={p.primary} strokeWidth={7} strokeLinecap="round" fill="none" /> : null,
        isColor(L) ? <Path key="sweat" d="M30 70 q-6 9 0 13 q6 -4 0 -13Z" fill={WATER} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" /> : null,
      ];
    case 'thinking':
      return [
        shape(L, 'book', { t: 'rect', x: 68, y: 138, w: 64, h: 42, r: 6, rot: -5 }, '#FFFFFF'),
        isColor(L) ? <Rect key="spine" x={68} y={138} width={12} height={42} rx={4} fill={p.primary} stroke={INK} strokeWidth={3} transform="rotate(-5 100 159)" /> : null,
        isColor(L) ? (
          <G key="dots">
            <Circle cx={150} cy={52} r={3.5} fill={p.primary} stroke={INK} strokeWidth={2} />
            <Circle cx={162} cy={40} r={5} fill={p.primary} stroke={INK} strokeWidth={2} />
            <Circle cx={178} cy={24} r={7} fill={p.primary} stroke={INK} strokeWidth={2} />
          </G>
        ) : null,
      ];
    default:
      return [];
  }
}

function face(mood: MascotMood, p: MascotPalette) {
  const line = { stroke: INK, strokeWidth: 4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const dot = (cx: number, cy: number, k: string) => (
    <G key={k}>
      <Circle cx={cx} cy={cy} r={5.5} fill={INK} />
      <Circle cx={cx + 1.8} cy={cy - 1.8} r={1.7} fill="#fff" />
    </G>
  );
  const smile = <Path key="smile" d="M92 122 Q96 128 100 122 Q104 128 108 122" {...line} strokeWidth={3.2} />;
  const out: React.ReactNode[] = [
    <Ellipse key="cl" cx={54} cy={128} rx={13} ry={9} fill={p.cheek} opacity={p.cheekOpacity} />,
    <Ellipse key="cr" cx={146} cy={128} rx={13} ry={9} fill={p.cheek} opacity={p.cheekOpacity} />,
  ];
  switch (mood) {
    case 'sleepy':
      out.push(
        <Path key="el" d="M66 113 Q74 120 82 113" {...line} />,
        <Path key="er" d="M118 113 Q126 120 134 113" {...line} />,
        <Ellipse key="m" cx={100} cy={126} rx={3.5} ry={4.5} fill={PEACH} stroke={INK} strokeWidth={2.5} />,
        <Path key="z" d="M150 70 h12 l-12 12 h12 M170 50 h9 l-9 9 h9" stroke={INK} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
      );
      break;
    case 'cheer':
      out.push(dot(74, 112, 'el'), dot(126, 112, 'er'), <Path key="m" d="M90 119 Q100 140 110 119Z" fill="#E8758A" stroke={INK} strokeWidth={3.2} strokeLinejoin="round" />);
      out.push(<Path key="s1" d={sparkle(30, 34, 9)} fill={GOLD} />, <Path key="s2" d={sparkle(174, 30, 8)} fill={GOLD} />);
      break;
    case 'celebrating':
      out.push(
        <Path key="el" d="M66 116 Q74 104 82 116" {...line} />,
        <Path key="er" d="M118 116 Q126 104 134 116" {...line} />,
        <Path key="m" d="M90 119 Q100 140 110 119Z" fill="#E8758A" stroke={INK} strokeWidth={3.2} strokeLinejoin="round" />,
        <Path key="c1" d={sparkle(30, 28, 9)} fill={GOLD} />,
        <Path key="c2" d={sparkle(172, 26, 8)} fill={GOLD} />,
        <Circle key="c3" cx={12} cy={44} r={4} fill={p.primary} />,
        <Circle key="c4" cx={190} cy={46} r={4} fill={p.accent} />,
        <Rect key="c5" x={46} y={6} width={9} height={5} rx={2} fill={p.accent} transform="rotate(30 50 8)" />,
        <Rect key="c6" x={150} y={8} width={9} height={5} rx={2} fill={p.primary} transform="rotate(-25 154 10)" />,
        <Path key="c7" d="M100 8 l5 8 h-10Z" fill={p.leaf} />,
        <Circle key="c8" cx={8} cy={96} r={3.5} fill={GOLD} />,
        <Circle key="c9" cx={194} cy={96} r={3.5} fill={p.leaf} />,
      );
      break;
    case 'sad':
      out.push(
        dot(74, 114, 'el'),
        dot(126, 114, 'er'),
        <Path key="bl" d="M64 105 L84 99" {...line} strokeWidth={3.2} />,
        <Path key="br" d="M136 105 L116 99" {...line} strokeWidth={3.2} />,
        <Path key="m" d="M93 130 Q100 122 107 130" {...line} strokeWidth={3.2} />,
        <Path key="t" d="M132 122 q-5 9 0 13 q5 -4 0 -13Z" fill={WATER} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />,
      );
      break;
    case 'eating':
      out.push(dot(74, 112, 'el'), dot(126, 112, 'er'), <Path key="m" d="M94 122 Q100 128 106 122" {...line} strokeWidth={3.2} />, <Path key="tg" d="M101 126 Q101 138 109 138 Q117 138 116 130 Q113 126 107 126Z" fill="#F58BA0" stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />);
      break;
    case 'loved':
      out.push(
        <Path key="el" d="M66 116 Q74 104 82 116" {...line} />,
        <Path key="er" d="M118 116 Q126 104 134 116" {...line} />,
        smile,
        <Path key="h1" d={heart(30, 52, 8)} fill={p.primary} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />,
        <Path key="h2" d={heart(172, 52, 6)} fill={p.cheek} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />,
      );
      break;
    case 'workout':
      out.push(dot(74, 114, 'el'), dot(126, 114, 'er'), <Path key="m" d="M92 124 Q100 129 108 124" {...line} strokeWidth={3.2} />);
      break;
    case 'thinking':
      out.push(dot(76, 116, 'el'), dot(124, 116, 'er'), <Path key="m" d="M95 124 L105 124" {...line} strokeWidth={3.2} />, <Path key="b" d="M64 102 L84 100" {...line} strokeWidth={3} />);
      break;
    default: // happy, hydrate
      out.push(dot(74, 112, 'el'), dot(126, 112, 'er'), smile);
  }
  return out;
}

/** feet, ears, head sprout and the cream body: the shared Bloom silhouette (everything except face, arms and props) */
export function mascotBody(L: Layer, p: MascotPalette, opts: { feet?: boolean; sprout?: boolean } = {}) {
  const color = isColor(L);
  return (
    <G>
      {opts.feet === false ? null : shape(L, 'footL', { t: 'ell', cx: 74, cy: 176, rx: 17, ry: 10 }, CREAM)}
      {opts.feet === false ? null : shape(L, 'footR', { t: 'ell', cx: 126, cy: 176, rx: 17, ry: 10 }, CREAM)}
      {shape(L, 'earL', { t: 'path', d: EAR_L }, CREAM)}
      {shape(L, 'earR', { t: 'path', d: EAR_R }, CREAM)}
      {color ? <Path d={EAR_IN_L} fill={PEACH} /> : null}
      {color ? <Path d={EAR_IN_R} fill={PEACH} /> : null}
      {opts.sprout === false ? null : limb(L, 'stem', 100, 47, 100, 38, 4, p.leaf)}
      {opts.sprout === false ? null : shape(L, 'leafL', { t: 'path', d: 'M100 40 C94 24 80 26 80 34 C84 42 94 44 100 40Z' }, p.leaf)}
      {opts.sprout === false ? null : shape(L, 'leafR', { t: 'path', d: 'M100 40 C106 22 122 24 120 34 C116 42 106 44 100 40Z' }, p.leaf)}
      {shape(L, 'body', { t: 'path', d: BODY_D }, CREAM)}
    </G>
  );
}

function figure(L: Layer, mood: MascotMood, p: MascotPalette) {
  const pose = POSES[mood];
  const color = isColor(L);
  return (
    <G>
      {(pose.back ?? []).map((a, i) => limb(L, `b${i}`, a[0], a[1], a[2], a[3]))}
      {mascotBody(L, p)}
      {color ? face(mood, p) : null}
      {props(L, mood, p)}
      {(pose.front ?? []).map((a, i) => limb(L, `f${i}`, a[0], a[1], a[2], a[3]))}
    </G>
  );
}

/** Full sticker: drop shadow, white die-cut border, then the colour artwork. Draw inside a 200x200 viewBox. */
export function MascotArt({ mood, palette }: { mood: MascotMood; palette: MascotPalette }) {
  return (
    <G>
      <G transform="translate(0 6)">{figure({ kind: 'flat', color: '#EFE3DF', grow: 5 }, mood, palette)}</G>
      <G transform="translate(0 4)">{figure({ kind: 'flat', color: '#E2D2CD', grow: 0 }, mood, palette)}</G>
      {figure({ kind: 'flat', color: '#FFFFFF', grow: 0 }, mood, palette)}
      {figure({ kind: 'color' }, mood, palette)}
    </G>
  );
}
