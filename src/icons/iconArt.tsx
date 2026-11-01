import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { CREAM, GOLD, heart, INK, sparkle } from '@/components/mascotArt';

/** Bloom's sticker icons in a 48x48 viewBox: mascot-style outlines over a white die-cut border. */
export const ICON_NAMES = [
  'home', 'chart', 'calendar', 'gear', 'sunrise', 'dumbbell', 'candy-off', 'salad', 'utensils', 'droplet', 'footprints', 'moon', 'sparkles', 'bell', 'bell-off', 'volume', 'alarm-clock', 'notification', 'check', 'close',
  'flame', 'lock', 'eyes', 'run', 'walk', 'yoga', 'badminton', 'book', 'heart', 'apple', 'coffee', 'bed', 'pencil', 'bike', 'leaf', 'sun', 'pill', 'music', 'smile',
] as const;
export type IconName = (typeof ICON_NAMES)[number];

export function isIconName(v: unknown): v is IconName {
  return typeof v === 'string' && (ICON_NAMES as readonly string[]).includes(v);
}

const SW = 1.8;
const BORDER = 1.5;
const WHITE = '#FFFFFF';
const STEEL = '#C3CEDA';
const STEEL_DARK = '#94A3B3';
const CHARCOAL = '#465563';
const SKY = '#9AD4F2';
const SKY_DARK = '#6DB4DE';
const LEAF = '#8FD3A1';
const LEAF_DARK = '#5FB07A';
const FLAME = '#F78F4B';
const RED = '#EC6A67';
const RED_DARK = '#C94F52';
const WOOD = '#C99A73';
const WOOD_DARK = '#A97B58';
const CREAM_SHADE = '#EBDCC6';
const GOLD_SHADE = '#E5A93B';
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
  /** flat shading inside a shape, with no outline or border */
  tone: (d: string, color: string, opacity?: number) => void;
  /** a white highlight stroke inside a shape */
  glint: (d: string, width?: number) => void;
  /** a small solid dot with no outline or border */
  dot: (cx: number, cy: number, r: number, color?: string) => void;
}

/** Bloom's round head, used by the activity icons. */
const bloomHead = (d: Draw, cx: number, cy: number) => {
  d.circle(cx - 5, cy - 5.5, 2.6, CREAM);
  d.circle(cx + 5, cy - 5.5, 2.6, CREAM);
  d.circle(cx, cy, 7, CREAM);
  d.dot(cx - 2.6, cy - 0.4, 1, INK);
  d.dot(cx + 2.6, cy - 0.4, 1, INK);
  d.dot(cx - 4.4, cy + 2, 1.3, '#F2B8A6');
  d.dot(cx + 4.4, cy + 2, 1.3, '#F2B8A6');
};

const ART: Record<IconName, (d: Draw, accent: string) => void> = {
  home: (d, a) => {
    d.rect(11.5, 21, 25, 20, 3.5, CREAM);
    d.tone('M31 22 H35.6 V37 A3 3 0 0 1 33 40 H31 Z', CREAM_SHADE);
    d.rect(20, 28, 8, 12.5, 2, WOOD);
    d.dot(25.8, 34.5, 0.9, INK);
    d.path('M6.5 23.5 L21.8 9.2 A3.2 3.2 0 0 1 26.2 9.2 L41.5 23.5 A1.7 1.7 0 0 1 40.3 26.4 H7.7 A1.7 1.7 0 0 1 6.5 23.5 Z', a);
    d.glint('M13.5 22 L22.5 13.6', 1.8);
  },
  chart: (d, a) => {
    d.rect(7, 7, 34, 34, 7, WHITE);
    d.rect(13, 26, 6, 10, 2, LEAF);
    d.rect(21, 19, 6, 17, 2, a);
    d.rect(29, 12, 6, 24, 2, GOLD);
  },
  calendar: (d, a) => {
    d.rect(7, 10.5, 34, 30, 6.5, CREAM);
    d.path('M7 21 V17 A6.5 6.5 0 0 1 13.5 10.5 H34.5 A6.5 6.5 0 0 1 41 17 V21 Z', a);
    d.limb('M16 7.5 V13.5', STEEL, 2.2);
    d.limb('M32 7.5 V13.5', STEEL, 2.2);
    d.dot(16, 27, 2.1, GOLD);
    d.dot(24, 27, 2.1, RED);
    d.dot(32, 27, 2.1, SKY_DARK);
    d.dot(16, 34, 2.1, LEAF_DARK);
    d.dot(24, 34, 2.1, GOLD);
  },
  gear: (d) => {
    for (const rot of [0, 45, 90, 135]) d.rect(19.5, 5.5, 9, 37, 3, STEEL, rot);
    d.circle(24, 24, 13, STEEL);
    d.tone('M24 37 A13 13 0 0 0 37 24 A15 15 0 0 1 24 37 Z', STEEL_DARK, 0.7);
    d.circle(24, 24, 5.5, CREAM);
  },
  sunrise: (d) => {
    d.line('M24 5.5 V9.5 M9.5 13 L12.5 16 M38.5 13 L35.5 16', GOLD_SHADE, 2.4);
    d.path('M11 31 A13 13 0 0 1 37 31 Z', GOLD);
    d.glint('M16 28 A8.5 8.5 0 0 1 21 21', 1.8);
    d.rect(5.5, 30.5, 37, 9, 4.5, SKY);
    d.line('M12 35 H22 M28 35 H35', WHITE, 1.8);
  },
  dumbbell: (d) => {
    d.rect(13, 20.5, 22, 7, 2.5, STEEL);
    d.rect(9.5, 12, 7.5, 24, 3, CHARCOAL);
    d.rect(31, 12, 7.5, 24, 3, CHARCOAL);
    d.rect(4.5, 16.5, 5, 15, 2.5, STEEL_DARK);
    d.rect(38.5, 16.5, 5, 15, 2.5, STEEL_DARK);
    d.glint('M12 16 V24', 1.6);
    d.glint('M33.5 16 V24', 1.6);
  },
  'candy-off': (d, a) => {
    d.path('M15 24 L6 16.5 Q4.5 24 6 31.5 Z', GOLD);
    d.path('M33 24 L42 16.5 Q43.5 24 42 31.5 Z', GOLD);
    d.circle(24, 24, 11, a);
    d.glint('M17.5 22 A7 7 0 0 1 22 17.5', 2);
    d.limb('M10.5 37.5 L37.5 10.5', RED, 3.2);
  },
  salad: (d) => {
    d.circle(14.5, 20, 6.5, LEAF);
    d.circle(33.5, 20, 6.5, LEAF_DARK);
    d.circle(24, 15, 8, LEAF);
    d.circle(27, 20.5, 3.4, RED);
    d.circle(18.5, 21, 2.6, GOLD);
    d.path('M6.5 24 H41.5 C41.5 34.5 33 41.5 24 41.5 C15 41.5 6.5 34.5 6.5 24 Z', CREAM);
    d.tone('M33 25 H40.3 C39.5 33 32.5 40.3 25 40.3 C30 37 33 31 33 25 Z', CREAM_SHADE);
  },
  utensils: (d) => {
    d.line('M11 7 V15 M16 7 V15 M21 7 V15', STEEL_DARK, 2);
    d.path('M9.8 14 H22.2 C22.2 21 20 24.5 16 24.5 C12 24.5 9.8 21 9.8 14 Z', STEEL);
    d.limb('M16 24.5 V40', STEEL, 3.4);
    d.path('M31 7 C38 10 38.5 21 38 26 H31 Z', STEEL);
    d.tone('M34.5 9.6 C37 13 37.3 21 36.9 24.9 H34.5 Z', STEEL_DARK, 0.6);
    d.limb('M33 26 V40', WOOD, 3.4);
  },
  droplet: (d) => {
    d.path('M24 5.5 C24 5.5 38.5 20.5 38.5 29.5 A14.5 14.5 0 0 1 9.5 29.5 C9.5 20.5 24 5.5 24 5.5 Z', SKY);
    d.tone('M33 18.5 C35.5 22 37.3 26.5 37.3 29.5 A13.3 13.3 0 0 1 24 42.8 C31 40 35 30 33 18.5 Z', SKY_DARK, 0.75);
    d.glint('M15.5 30 A8.5 8.5 0 0 0 21 37.2', 2.4);
    d.dot(17.5, 24.5, 1.3, WHITE);
  },
  footprints: (d, a) => {
    d.path('M6.5 24.5 C12 24.5 17.5 20.5 20.5 12.5 A2 2 0 0 1 23 11.5 L29.5 14.5 A2 2 0 0 1 30.6 16.2 C31 22 36 25 40.5 27 A3 3 0 0 1 42 29.5 V35 H6.5 Z', a);
    d.line('M21.5 19 L26 21 M19.5 23 L24 25', WHITE, 2);
    d.rect(5.5, 33.5, 37.5, 6.5, 3, WHITE);
    d.line('M11 36.8 H14 M19 36.8 H22 M27 36.8 H30', STEEL_DARK, 1.6);
  },
  moon: (d) => {
    d.path('M30 6.5 A18.5 18.5 0 1 0 41.5 31 A15.5 15.5 0 0 1 30 6.5 Z', GOLD);
    d.tone('M13 34 A16 16 0 0 0 39 32.8 C30 37 20 37 13 34 Z', GOLD_SHADE, 0.75);
    d.dot(13.5, 22, 1.8, GOLD_SHADE);
    d.dot(19, 29, 1.3, GOLD_SHADE);
    d.path(sparkle(36.5, 14, 4.5), WHITE);
  },
  sparkles: (d) => {
    d.path(sparkle(21, 26.5, 15.5), GOLD);
    d.path(sparkle(37.5, 11.5, 6.5), WHITE);
    d.path(sparkle(38, 36.5, 4), GOLD);
  },
  flame: (d) => {
    d.path('M25 4.5 C27 13 38.5 18 38.5 29 A14.5 14.5 0 0 1 9.5 29 C9.5 22 14.5 19 16.5 12.5 C19.5 16.5 23 15 25 4.5 Z', FLAME);
    d.path('M24 21.5 C25.5 26.5 31 28.5 31 34 A7 7 0 0 1 17 34 C17 29.5 22 27.5 24 21.5 Z', GOLD);
    d.dot(23.5, 35.5, 2.4, WHITE);
  },
  lock: (d) => {
    d.limb('M16 22 V15 A8 8 0 0 1 32 15 V22', STEEL, 3.4);
    d.rect(9.5, 20.5, 29, 21, 5.5, GOLD);
    d.tone('M31 21.6 H33 A4.4 4.4 0 0 1 37.4 26 V36 A4.4 4.4 0 0 1 33 40.4 H31 Z', GOLD_SHADE, 0.75);
    d.dot(24, 29, 3, INK);
    d.line('M24 30 V35.5', INK, 2.6);
  },
  eyes: (d) => {
    d.ellipse(14.5, 24, 9.5, 13, WHITE);
    d.ellipse(33.5, 24, 9.5, 13, WHITE);
    d.dot(16.5, 26, 4.8, CHARCOAL);
    d.dot(35.5, 26, 4.8, CHARCOAL);
    d.dot(18, 24, 1.6, WHITE);
    d.dot(37, 24, 1.6, WHITE);
  },
  run: (d, a) => {
    d.limb('M21 31 L13 34 L7.5 31', CREAM);
    d.limb('M23 31 L31 35 L29 42', CREAM);
    d.limb('M25 22 L34 25 L39.5 21', CREAM);
    d.ellipse(23.5, 26, 6.5, 8, a, 15);
    d.limb('M22 22 L14 22 L10.5 27', CREAM);
    bloomHead(d, 27, 11.5);
  },
  walk: (d, a) => {
    d.limb('M20.5 32 L18 42', CREAM);
    d.limb('M27.5 32 L31 42', CREAM);
    d.limb('M18.5 23 L13.5 30', CREAM);
    d.limb('M29.5 23 L34.5 30', CREAM);
    d.ellipse(24, 27, 7, 8.5, a);
    bloomHead(d, 24, 12);
  },
  yoga: (d, a) => {
    d.ellipse(24, 39.5, 18, 3.6, STEEL);
    d.limb('M19 34 L9 37 M29 34 L39 37', CREAM);
    d.limb('M19 24 L10 32', CREAM);
    d.limb('M29 24 L38 32', CREAM);
    d.ellipse(24, 29, 7.5, 8.5, a);
    bloomHead(d, 24, 13.5);
  },
  badminton: (d, a) => {
    d.limb('M20 28.5 L9 41', WOOD, 3.2);
    d.ellipse(28.5, 17.5, 11.5, 13.5, WHITE, 40);
    d.line('M21.5 11 L35 25 M18 16.5 L31 30.5 M30 7.5 L20 26 M36.5 12.5 L25.5 31', a, 1.2);
    d.ellipse(9.5, 11, 3.6, 3.6, GOLD);
    d.dot(8.5, 10, 1, WHITE);
  },
  book: (d, a) => {
    d.path('M24 12.5 C19 8.5 12 8 6.5 10 A1.5 1.5 0 0 0 5.5 11.4 V36.5 A1.5 1.5 0 0 0 7.5 38 C12.5 36 19 36 24 40 Z', a);
    d.path('M24 12.5 C29 8.5 36 8 41.5 10 A1.5 1.5 0 0 1 42.5 11.4 V36.5 A1.5 1.5 0 0 1 40.5 38 C35.5 36 29 36 24 40 Z', WHITE);
    d.line('M29 18 C32 16.8 34.5 16.5 37.5 17 M29 24 C32 22.8 34.5 22.5 37.5 23 M29 30 C32 28.8 34.5 28.5 37.5 29', STEEL_DARK, 1.7);
    d.glint('M10 15 C13 14 15.5 14 18 15', 1.8);
  },
  heart: (d) => {
    d.path(heart(24, 25, 16), RED);
    d.glint('M12.5 18.5 C13.5 15.5 16 14 18.5 14.5', 2.4);
  },
  apple: (d) => {
    d.limb('M24 16 C24 11.5 25.5 9 28 7.5', WOOD_DARK, 1.8);
    d.ellipse(33, 10.5, 5.5, 3, LEAF, -25);
    d.path('M24 16.5 C30 11 42 14.5 40.5 27 C39.5 36.5 32.5 43 28 41.5 C26 41 22 41 20 41.5 C15.5 43 8.5 36.5 7.5 27 C6 14.5 18 11 24 16.5 Z', RED);
    d.tone('M34 16.7 C38 18.5 40 22 39.3 27 C38.3 35.5 32 41.5 28.2 40.3 C32.5 36.5 36 26 34 16.7 Z', RED_DARK, 0.6);
    d.glint('M13 23 C13.5 20.5 15.5 19 17.5 18.8', 2.2);
  },
  coffee: (d, a) => {
    d.line('M16.5 5.5 Q20 9.5 16.5 13.5 M26 5.5 Q29.5 9.5 26 13.5', STEEL_DARK, 2);
    d.limb('M35 23.5 H38 A4.5 4.5 0 0 1 38 32.5 H34.5', a, 2.8);
    d.path('M8.5 17.5 H36.5 V33.5 A7.5 7.5 0 0 1 29 41 H16 A7.5 7.5 0 0 1 8.5 33.5 Z', a);
    d.glint('M13 22 V32', 2.2);
  },
  bed: (d, a) => {
    d.rect(5.5, 11, 6, 30, 2.5, WOOD);
    d.rect(36.5, 21, 6, 20, 2.5, WOOD);
    d.rect(9, 27, 30, 9, 2.5, CREAM);
    d.rect(12, 19.5, 11.5, 8, 3.5, WHITE);
    d.path('M23.5 22 H35 A4 4 0 0 1 39 26 V31 H23.5 Z', a);
    d.glint('M28 25.5 H34', 1.6);
  },
  pencil: (d, a) => {
    d.path('M31 8 A2.8 2.8 0 0 1 35 8 L40 13 A2.8 2.8 0 0 1 40 17 L18 39 L8 40.5 L9 30 Z', a);
    d.path('M9 30 L18 39 L8 40.5 Z', CREAM);
    d.dot(9.6, 38.8, 1.4, INK);
    d.path('M31 8 A2.8 2.8 0 0 1 35 8 L40 13 A2.8 2.8 0 0 1 40 17 L36.5 20.5 L27.5 11.5 Z', RED);
    d.glint('M14 28.5 L27 15.5', 1.8);
  },
  bike: (d, a) => {
    d.circle(12, 31, 8.5, WHITE);
    d.circle(36, 31, 8.5, WHITE);
    d.dot(12, 31, 1.6, CHARCOAL);
    d.dot(36, 31, 1.6, CHARCOAL);
    d.limb('M12 31 L20 18 H32 L36 31 M20 18 L26 31 L32 18 M26 31 H12', a, 2);
    d.limb('M17.5 14 H23', CHARCOAL, 2.6);
    d.limb('M32 18 L31 11.5 H36', CHARCOAL, 2.2);
  },
  leaf: (d) => {
    d.path('M8.5 39.5 C4.5 20 20 6.5 41.5 6.5 C42.5 28 29 43.5 8.5 39.5 Z', LEAF);
    d.tone('M12 38.5 C24 32 33 22 39.5 9 C39.5 26 28 41 12 38.5 Z', LEAF_DARK, 0.6);
    d.line('M8.5 39.5 C16 30 24 22 32 16 M21 26.5 V18.5 M26 22.5 H33', INK, 1.5);
  },
  sun: (d) => {
    d.line('M24 4.5 V9.5 M24 38.5 V43.5 M4.5 24 H9.5 M38.5 24 H43.5 M10.2 10.2 L13.7 13.7 M34.3 34.3 L37.8 37.8 M37.8 10.2 L34.3 13.7 M13.7 34.3 L10.2 37.8', GOLD_SHADE, 2.8);
    d.circle(24, 24, 11.5, GOLD);
    d.glint('M17.5 22.5 A7 7 0 0 1 22 17.5', 2.2);
  },
  pill: (d, a) => {
    d.rect(6.5, 16, 35, 16, 8, WHITE, -35);
    d.path('M24 24 L18.1 15.6 L12.3 19.7 A8 8 0 0 0 21.5 32.8 L29.9 26.9 L24 24 Z', a);
    d.glint('M12.5 24.5 L17.5 21', 2);
  },
  music: (d, a) => {
    d.path('M18.5 12.5 L39.5 7.5 V15 L18.5 20 Z', a);
    d.limb('M18.5 14 V34', CHARCOAL, 1.8);
    d.limb('M39.5 9 V30', CHARCOAL, 1.8);
    d.ellipse(13.5, 35, 6.5, 5, a, -12);
    d.ellipse(34.5, 31, 6.5, 5, a, -12);
    d.glint('M10.5 34 L13.5 32.8', 1.5);
    d.glint('M31.5 30 L34.5 28.8', 1.5);
  },
  smile: (d) => {
    d.circle(24, 24, 17.5, GOLD);
    d.tone('M36 15 A15.5 15.5 0 0 1 24 40.3 C32 38 37.5 26 36 15 Z', GOLD_SHADE, 0.6);
    d.dot(17.5, 20, 2.4, INK);
    d.dot(30.5, 20, 2.4, INK);
    d.dot(13.5, 27, 2.6, '#F2A08E');
    d.dot(34.5, 27, 2.6, '#F2A08E');
    d.line('M17 28 Q24 36 31 28', INK, 2);
  },
  bell: (d, a) => {
    d.path('M24 6.5 C16.5 6.5 12 12.5 12 20 V27 C12 31 9.5 34 7 36.5 H41 C38.5 34 36 31 36 27 V20 C36 12.5 31.5 6.5 24 6.5 Z', a);
    d.tone('M27 8 C32 10 35 15 35 21 V27 C35 31 37 34 39 36 H27 Z', GOLD_SHADE, 0.45);
    d.path('M18.5 38 A5.5 5.5 0 0 0 29.5 38 Z', GOLD);
    d.glint('M16.5 17 C17.5 12.5 20 10.5 23 10', 1.8);
  },
  'bell-off': (d, a) => {
    d.path('M24 6.5 C16.5 6.5 12 12.5 12 20 V27 C12 31 9.5 34 7 36.5 H41 C38.5 34 36 31 36 27 V20 C36 12.5 31.5 6.5 24 6.5 Z', a);
    d.path('M18.5 38 A5.5 5.5 0 0 0 29.5 38 Z', GOLD);
    d.line('M10 10 L38 38', RED_DARK, 4);
  },
  volume: (d, a) => {
    d.path('M6 18 H15 L26 10 V38 L15 30 H6 Z', a);
    d.tone('M20 14 L26 10 V38 L20 34 Z', GOLD_SHADE, 0.45);
    d.line('M31 18 Q39 24 31 30', STEEL_DARK, 2.6);
    d.line('M34 12 Q46 24 34 36', a, 2.4);
    d.glint('M9 21 H14', 1.5);
  },
  'alarm-clock': (d, a) => {
    d.line('M15 9 L10 5 M33 9 L38 5', WOOD_DARK, 3);
    d.circle(24, 25, 16, a);
    d.tone('M27 10 A16 16 0 0 1 27 40 A18 18 0 0 0 27 10 Z', GOLD_SHADE, 0.42);
    d.line('M24 15 V25 L31 29', WHITE, 2.8);
    d.circle(24, 25, 2.2, GOLD);
    d.glint('M16 15 A11 11 0 0 1 22 12', 1.8);
    d.limb('M18 39 L15 43 M30 39 L33 43', WOOD, 2.6);
  },
  notification: (d, a) => {
    d.line('M18 8 A6 6 0 0 1 30 8 M24 8 C13 8 9.5 17 9.5 26.5 V31 C9.5 36.5 7.5 40.5 4.5 42 H43.5 C40.5 40.5 38.5 36.5 38.5 31 V26.5 C38.5 17 35 8 24 8', '#000000', 4.8);
    d.line('M14 20 C15 15 18.5 12 23 11', '#000000', 4.8);
    d.line('M19 42 C20 48 28 48 29 42', '#000000', 4.8);
  },
  check: (d) => {
    d.circle(24, 24, 18, LEAF);
    d.line('M14 24 L21 31 L35 16.5', WHITE, 3.5);
  },
  close: (d) => {
    d.circle(24, 24, 18, RED);
    d.line('M17 17 L31 31 M31 17 L17 31', WHITE, 3.5);
  },
};

function render(name: IconName, accent: string, halo: boolean): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let k = 0;
  const key = () => `${halo ? 'h' : 'c'}${k++}`;
  const filled = (fill: string) => (halo ? { fill: WHITE, stroke: WHITE, strokeWidth: SW + 2 * BORDER, ...round } : { fill, stroke: INK, strokeWidth: SW, ...round });
  const stroke = (color: string, width: number) => ({ fill: 'none', stroke: halo ? WHITE : color, strokeWidth: halo ? width + 2 * BORDER : width, ...round });
  const colorOnly = (node: () => React.ReactNode) => {
    if (!halo) out.push(node());
  };
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
    tone: (d, color, opacity = 1) => colorOnly(() => <Path key={key()} d={d} fill={color} opacity={opacity} />),
    glint: (d, width = 2) => colorOnly(() => <Path key={key()} d={d} fill="none" stroke={WHITE} strokeWidth={width} opacity={0.8} {...round} />),
    dot: (cx, cy, r, color = INK) => colorOnly(() => <Circle key={key()} cx={cx} cy={cy} r={r} fill={color} />),
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
