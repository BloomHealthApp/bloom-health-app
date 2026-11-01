import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { CREAM, GOLD, heart, INK, sparkle } from '@/components/mascotArt';

/** Bloom's sticker icons in a 48x48 viewBox: mascot-style outlines over a white die-cut border. */
export const ICON_NAMES = [
  'home', 'chart', 'calendar', 'gear', 'sunrise', 'dumbbell', 'candy-off', 'salad', 'utensils', 'droplet', 'footprints', 'moon', 'sparkles',
  'flame', 'lock', 'eyes', 'run', 'walk', 'yoga', 'badminton', 'book', 'heart', 'apple', 'coffee', 'bed', 'pencil', 'bike', 'leaf', 'sun', 'pill', 'music', 'smile',
] as const;
export type IconName = (typeof ICON_NAMES)[number];

export function isIconName(v: unknown): v is IconName {
  return typeof v === 'string' && (ICON_NAMES as readonly string[]).includes(v);
}

const SW = 2;
const BORDER = 1.6;
const WHITE = '#FFFFFF';
const STEEL = '#AEB9C6';
const CHARCOAL = '#3B4652';
const SKY = '#8CC6EA';
const LEAF = '#7CC48F';
const FLAME = '#F2803A';
const RED = '#D9534F';
const WOOD = '#B9835A';
const round = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

interface Draw {
  path: (d: string, fill: string) => void;
  circle: (cx: number, cy: number, r: number, fill: string) => void;
  ellipse: (cx: number, cy: number, rx: number, ry: number, fill: string, rot?: number) => void;
  rect: (x: number, y: number, w: number, h: number, r: number, fill: string, rot?: number) => void;
  /** an open stroke with no outline of its own */
  line: (d: string, color?: string, width?: number) => void;
  /** a thick outlined stroke, for arms, legs and handles */
  limb: (d: string, color: string, width?: number) => void;
}

const ART: Record<IconName, (d: Draw, accent: string) => void> = {
  home: (d, a) => {
    d.rect(12, 22, 24, 18, 3, CREAM);
    d.rect(21, 29, 7, 11, 1.5, WOOD);
    d.path('M7 24 L24 8 L41 24 Z', a);
  },
  chart: (d, a) => {
    d.rect(8, 8, 32, 32, 5, WHITE);
    d.rect(14, 26, 5, 9, 1, LEAF);
    d.rect(21.5, 20, 5, 15, 1, a);
    d.rect(29, 14, 5, 21, 1, GOLD);
  },
  calendar: (d, a) => {
    d.rect(8, 11, 32, 29, 5, CREAM);
    d.path('M8 21 V16 A5 5 0 0 1 13 11 H35 A5 5 0 0 1 40 16 V21 Z', a);
    d.line('M16 7 V14 M32 7 V14');
    d.circle(17, 28, 2, GOLD);
    d.circle(24, 28, 2, LEAF);
    d.circle(31, 28, 2, SKY);
    d.circle(17, 34.5, 2, SKY);
    d.circle(24, 34.5, 2, GOLD);
  },
  gear: (d) => {
    for (const rot of [0, 45, 90, 135]) d.rect(20.5, 6.5, 7, 35, 2, STEEL, rot);
    d.circle(24, 24, 12, STEEL);
    d.circle(24, 24, 5, CREAM);
  },
  sunrise: (d) => {
    d.line('M24 7 V11 M10 15 L13 18 M38 15 L35 18');
    d.path('M12 31 A12 12 0 0 1 36 31 Z', GOLD);
    d.rect(6, 31, 36, 7, 3.5, SKY);
  },
  dumbbell: (d) => {
    d.rect(14, 21, 20, 6, 2, STEEL);
    d.rect(10, 13, 6, 22, 2, CHARCOAL);
    d.rect(32, 13, 6, 22, 2, CHARCOAL);
    d.rect(5, 17, 5, 14, 2, CHARCOAL);
    d.rect(38, 17, 5, 14, 2, CHARCOAL);
  },
  'candy-off': (d, a) => {
    d.path('M15 24 L6 17 V31 Z', GOLD);
    d.path('M33 24 L42 17 V31 Z', GOLD);
    d.circle(24, 24, 10, a);
    d.limb('M11 37 L37 11', RED, 3);
  },
  salad: (d) => {
    d.circle(15, 20, 6, LEAF);
    d.circle(24, 15, 7, LEAF);
    d.circle(33, 20, 6, LEAF);
    d.circle(27, 21, 3, RED);
    d.path('M7 24 H41 C41 34 33 41 24 41 C15 41 7 34 7 24 Z', CREAM);
  },
  utensils: (d) => {
    d.line('M11 8 V17 M16 8 V17 M21 8 V17');
    d.path('M11 16 H21 C21 22 19 24 16 24 C13 24 11 22 11 16 Z', STEEL);
    d.limb('M16 24 V40', STEEL, 3.5);
    d.path('M31 8 C37 11 37 22 37 25 H31 Z', STEEL);
    d.limb('M33 25 V40', STEEL, 3.5);
  },
  droplet: (d) => {
    d.path('M24 6 C24 6 38 21 38 29.5 A14 14 0 0 1 10 29.5 C10 21 24 6 24 6 Z', SKY);
    d.line('M16 30 A8 8 0 0 0 22 37', WHITE, 2.4);
  },
  footprints: (d, a) => {
    d.path('M7 25 C12 25 18 21 21 13 L30 17 C31 23 36 26 41 28 C42 31 41 36 41 36 H7 Z', a);
    d.line('M22 20 L26 22 M20 24 L24 26', WHITE, 1.8);
    d.rect(6, 34, 36, 6, 2.5, WHITE);
  },
  moon: (d) => {
    d.path('M31 7 A18 18 0 1 0 41 31 A15 15 0 0 1 31 7 Z', GOLD);
    d.path(sparkle(36, 15, 4), WHITE);
  },
  sparkles: (d) => {
    d.path(sparkle(21, 26, 15), GOLD);
    d.path(sparkle(37, 12, 7), WHITE);
  },
  flame: (d) => {
    d.path('M25 5 C27 13 38 18 38 29 A14 14 0 0 1 10 29 C10 22 15 19 17 13 C20 17 23 15 25 5 Z', FLAME);
    d.path('M24 23 C25 27 30 29 30 34 A6 6 0 0 1 18 34 C18 30 22 28 24 23 Z', GOLD);
  },
  lock: (d) => {
    d.line('M16 22 V15 A8 8 0 0 1 32 15 V22', STEEL, 5);
    d.line('M16 22 V15 A8 8 0 0 1 32 15 V22', INK, 1);
    d.rect(10, 21, 28, 20, 4, GOLD);
    d.circle(24, 29, 2.6, INK);
    d.line('M24 30 V35');
  },
  eyes: (d) => {
    d.ellipse(15, 24, 9, 12, WHITE);
    d.ellipse(33, 24, 9, 12, WHITE);
    d.circle(17, 26, 4, INK);
    d.circle(35, 26, 4, INK);
  },
  run: (d, a) => {
    d.limb('M22 28 L14 34 L8 32', CHARCOAL);
    d.limb('M22 28 L30 34 L28 42', CHARCOAL);
    d.limb('M24 18 L34 22 L39 18', CREAM);
    d.limb('M24 18 L14 20 L11 26', CREAM);
    d.limb('M25 16 L22 28', a, 6);
    d.circle(29, 10, 5.5, CREAM);
  },
  walk: (d, a) => {
    d.limb('M24 28 L19 42', CHARCOAL);
    d.limb('M24 28 L30 42', CHARCOAL);
    d.limb('M24 18 L17 26', CREAM);
    d.limb('M24 18 L31 26', CREAM);
    d.limb('M24 17 V28', a, 6);
    d.circle(24, 9.5, 5.5, CREAM);
  },
  yoga: (d, a) => {
    d.limb('M10 38 Q24 44 38 38', CHARCOAL);
    d.limb('M24 19 L12 31', CREAM);
    d.limb('M24 19 L36 31', CREAM);
    d.limb('M24 18 V32', a, 7);
    d.circle(24, 10, 5.5, CREAM);
  },
  badminton: (d, a) => {
    d.limb('M20 28 L9 41', WOOD, 3);
    d.ellipse(28, 18, 11, 13, WHITE, 40);
    d.line('M22 11 L35 25 M18 16 L31 30 M31 9 L20 26 M36 14 L25 31', a, 1.3);
    d.circle(9, 12, 3, GOLD);
  },
  book: (d, a) => {
    d.path('M24 13 C19 9 12 9 7 11 V37 C12 35 19 35 24 39 Z', a);
    d.path('M24 13 C29 9 36 9 41 11 V37 C36 35 29 35 24 39 Z', WHITE);
    d.line('M29 18 H36 M29 24 H36', INK, 1.6);
  },
  heart: (d, a) => {
    d.path(heart(24, 25, 15), a);
  },
  apple: (d) => {
    d.line('M24 16 C24 11 26 8 29 7');
    d.ellipse(32, 11, 5, 2.8, LEAF, -25);
    d.path('M24 17 C30 12 41 15 40 27 C39 36 32 42 28 41 C26 40.5 22 40.5 20 41 C16 42 9 36 8 27 C7 15 18 12 24 17 Z', RED);
  },
  coffee: (d, a) => {
    d.line('M17 6 Q20 10 17 14 M26 6 Q29 10 26 14');
    d.limb('M35 24 H38 A4 4 0 0 1 38 33 H35', a, 2.8);
    d.path('M9 18 H36 V33 A7 7 0 0 1 29 40 H16 A7 7 0 0 1 9 33 Z', a);
  },
  bed: (d, a) => {
    d.rect(6, 12, 5, 28, 2, WOOD);
    d.rect(37, 22, 5, 18, 2, WOOD);
    d.rect(9, 27, 31, 8, 2, CREAM);
    d.rect(12, 21, 11, 7, 3, WHITE);
    d.path('M23 23 H36 A3 3 0 0 1 39 26 V30 H23 Z', a);
  },
  pencil: (d, a) => {
    d.path('M31 8 L40 17 L18 39 L8 40 L9 30 Z', a);
    d.path('M9 30 L18 39 L8 40 Z', CREAM);
    d.path('M31 8 L40 17 L36 21 L27 12 Z', RED);
  },
  bike: (d, a) => {
    d.circle(12, 31, 8, WHITE);
    d.circle(36, 31, 8, WHITE);
    d.limb('M12 31 L20 18 H32 L36 31 M20 18 L26 31 L32 18 M26 31 H12', a, 2.2);
    d.limb('M18 14 H23', CHARCOAL, 2.6);
    d.limb('M32 18 L31 12 H36', CHARCOAL, 2.2);
  },
  leaf: (d) => {
    d.path('M9 39 C5 20 20 7 41 7 C42 28 29 43 9 39 Z', LEAF);
    d.line('M9 39 C16 30 24 22 32 16', INK, 1.6);
  },
  sun: (d) => {
    d.line('M24 5 V10 M24 38 V43 M5 24 H10 M38 24 H43 M10.5 10.5 L14 14 M34 34 L37.5 37.5 M37.5 10.5 L34 14 M14 34 L10.5 37.5');
    d.circle(24, 24, 11, GOLD);
  },
  pill: (d, a) => {
    d.rect(7, 17, 34, 14, 7, WHITE, -35);
    d.path('M24 24 L18 15.4 L12.7 19.1 C8.8 21.8 7.8 27.2 10.6 31.1 C13.3 35 18.7 36 22.6 33.2 L29.7 28.3 Z', a);
  },
  music: (d, a) => {
    d.path('M19 13 L39 8 V15 L19 20 Z', a);
    d.line('M19 14 V34 M39 9 V30');
    d.ellipse(14, 35, 6, 4.5, a);
    d.ellipse(34, 31, 6, 4.5, a);
  },
  smile: (d) => {
    d.circle(24, 24, 17, GOLD);
    d.circle(18, 20, 2.3, INK);
    d.circle(30, 20, 2.3, INK);
    d.line('M15 28 Q24 37 33 28');
  },
};

function render(name: IconName, accent: string, halo: boolean): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let k = 0;
  const key = () => `${halo ? 'h' : 'c'}${k++}`;
  const filled = (fill: string) => (halo ? { fill: WHITE, stroke: WHITE, strokeWidth: SW + 2 * BORDER, ...round } : { fill, stroke: INK, strokeWidth: SW, ...round });
  const stroke = (color: string, width: number) => ({ fill: 'none', stroke: halo ? WHITE : color, strokeWidth: halo ? width + 2 * BORDER : width, ...round });
  const draw: Draw = {
    path: (d, fill) => out.push(<Path key={key()} d={d} {...filled(fill)} />),
    circle: (cx, cy, r, fill) => out.push(<Circle key={key()} cx={cx} cy={cy} r={r} {...filled(fill)} />),
    ellipse: (cx, cy, rx, ry, fill, rot) => out.push(<Ellipse key={key()} cx={cx} cy={cy} rx={rx} ry={ry} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined} {...filled(fill)} />),
    rect: (x, y, w, h, r, fill, rot) => out.push(<Rect key={key()} x={x} y={y} width={w} height={h} rx={r} transform={rot ? `rotate(${rot} ${x + w / 2} ${y + h / 2})` : undefined} {...filled(fill)} />),
    line: (d, color = INK, width = SW) => out.push(<Path key={key()} d={d} {...stroke(color, width)} />),
    limb: (d, color, width = 4) => {
      out.push(<Path key={key()} d={d} {...stroke(INK, width + 2 * SW)} />);
      out.push(<Path key={key()} d={d} {...stroke(color, width)} />);
    },
  };
  ART[name](draw, accent);
  return out;
}

/** SVG elements to place inside a viewBox="0 0 48 48" <Svg>. `accent` is the theme colour used on the icon's main part. */
export function iconArt(name: IconName, accent: string): React.ReactElement {
  return (
    <G>
      {render(name, accent, true)}
      {render(name, accent, false)}
    </G>
  );
}
