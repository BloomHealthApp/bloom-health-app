import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { mascotBody, COLOR_LAYER, GOLD, heart, INK, limb, PEACH, sparkle, type MascotPalette } from '@/components/mascotArt';
import { isAvatarId, type AvatarId } from './avatarCatalog';

/**
 * The 9 cotton-candy Bloom avatars. Same original bunny-bear as the mascot (shared silhouette from mascotArt.tsx), each with its own
 * accessory, on a soft round pastel background. 200x200 viewBox; the background fills the square and the host crops it to a circle.
 * The palette is fixed (not theme-dependent) so avatars look the same everywhere. Only Circle/Ellipse/G/Path/Rect/Line are used,
 * so these trees can also be serialised to SVG strings (see widgets/svg.ts).
 */
export const PINK = '#F8D7E8';
export const PINK_DEEP = '#D65B98';
export const BLUE = '#CFE8F7';
export const LILAC = '#E9E2FF';
export const CREAM_BG = '#FFF9F5';

const PALETTE: MascotPalette = { cheek: '#F59DBE', primary: PINK_DEEP, soft: BLUE, accent: '#B9A7E8', leaf: '#9ED8B5', cheekOpacity: 0.7 };
const MOUTH = '#E8758A';
const TONGUE = '#F58BA0';
const WAFFLE = '#F2D6A2';
const BLUE_DEEP = '#8CC6EA';
const LILAC_DEEP = '#B9A7E8';
const SW = 3.6;

const BACKGROUNDS: Record<AvatarId, string> = {
  'bubu-01': PINK,
  'bubu-02': BLUE,
  'bubu-03': LILAC,
  'bubu-04': CREAM_BG,
  'bubu-05': BLUE,
  'bubu-06': PINK,
  'bubu-07': LILAC,
  'bubu-08': BLUE,
  'bubu-09': PINK,
};

const ink = { stroke: INK, strokeWidth: SW, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const line = { ...ink, fill: 'none' };

const eye = (cx: number, cy: number, k: string) => (
  <G key={k}>
    <Circle cx={cx} cy={cy} r={5.5} fill={INK} />
    <Circle cx={cx + 1.8} cy={cy - 1.8} r={1.7} fill="#fff" />
  </G>
);
const happyEye = (cx: number, cy: number, k: string) => <Path key={k} d={`M${cx - 8} ${cy + 3} Q${cx} ${cy - 9} ${cx + 8} ${cy + 3}`} {...line} strokeWidth={4} />;
const sleepyEye = (cx: number, cy: number, k: string) => <Path key={k} d={`M${cx - 8} ${cy} Q${cx} ${cy + 8} ${cx + 8} ${cy}`} {...line} strokeWidth={4} />;
const smile = <Path key="smile" d="M92 122 Q96 128 100 122 Q104 128 108 122" {...line} strokeWidth={3.2} />;
const openMouth = <Path key="mouth" d="M89 119 Q100 143 111 119Z" fill={MOUTH} stroke={INK} strokeWidth={3.2} strokeLinejoin="round" />;

/** soft blush + the standard cheeks */
const cheeks = (p: MascotPalette) => [
  <Ellipse key="cl" cx={54} cy={128} rx={13} ry={9} fill={p.cheek} opacity={p.cheekOpacity} />,
  <Ellipse key="cr" cx={146} cy={128} rx={13} ry={9} fill={p.cheek} opacity={p.cheekOpacity} />,
];

const star = (cx: number, cy: number, r: number) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.48;
    return `${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join(' L')}Z`;
};

const bow = (cx: number, cy: number, s: number, rot: number) => (
  <G key="bow" transform={`rotate(${rot} ${cx} ${cy})`}>
    <Path d={`M${cx} ${cy} C${cx - 14 * s} ${cy - 15 * s} ${cx - 22 * s} ${cy - 4 * s} ${cx - 20 * s} ${cy + 8 * s} C${cx - 14 * s} ${cy + 14 * s} ${cx - 6 * s} ${cy + 8 * s} ${cx} ${cy}Z`} fill={PINK_DEEP} {...ink} />
    <Path d={`M${cx} ${cy} C${cx + 14 * s} ${cy - 15 * s} ${cx + 22 * s} ${cy - 4 * s} ${cx + 20 * s} ${cy + 8 * s} C${cx + 14 * s} ${cy + 14 * s} ${cx + 6 * s} ${cy + 8 * s} ${cx} ${cy}Z`} fill={PINK_DEEP} {...ink} />
    <Circle cx={cx} cy={cy} r={5 * s} fill="#F08DBA" {...ink} />
  </G>
);

const flower = (cx: number, cy: number, r: number, fill: string, k: string) => (
  <G key={k}>
    {[0, 72, 144, 216, 288].map((a) => (
      <Circle key={a} cx={cx + r * 0.95 * Math.sin((a * Math.PI) / 180)} cy={cy - r * 0.95 * Math.cos((a * Math.PI) / 180)} r={r * 0.8} fill={fill} stroke={INK} strokeWidth={2.6} />
    ))}
    <Circle cx={cx} cy={cy} r={r * 0.62} fill={GOLD} stroke={INK} strokeWidth={2.4} />
  </G>
);

const cone = (x: number, y: number, w: number, h: number, k: string) => (
  <G key={k}>
    <Path d={`M${x} ${y} L${x + w} ${y} L${x + w / 2} ${y + h}Z`} fill={WAFFLE} {...ink} />
    <Path d={`M${x + w * 0.22} ${y + 3} L${x + w * 0.62} ${y + h * 0.62} M${x + w * 0.78} ${y + 3} L${x + w * 0.38} ${y + h * 0.62}`} stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.55} />
  </G>
);

type Art = { behind?: React.ReactNode; face: React.ReactNode; front?: React.ReactNode; sprout?: boolean; /** shift the bunny sideways to make room for a prop */ dx?: number };

function artFor(id: AvatarId, p: MascotPalette): Art {
  switch (id) {
    case 'bubu-02': // cloud hat: pink-and-blue cotton-candy swirl on the head
      return {
        sprout: false,
        face: [...cheeks(p), eye(74, 112, 'el'), eye(126, 112, 'er'), smile],
        front: (
          <G key="cloud">
            <Circle cx={74} cy={44} r={15} fill={BLUE_DEEP} {...ink} />
            <Circle cx={126} cy={44} r={15} fill={BLUE_DEEP} {...ink} />
            <Circle cx={90} cy={32} r={19} fill={PINK} {...ink} />
            <Circle cx={112} cy={30} r={18} fill={PINK} {...ink} />
            <Circle cx={100} cy={46} r={14} fill={BLUE} {...ink} />
            <Circle cx={100} cy={16} r={11} fill="#fff" {...ink} />
            <Path d="M80 30 Q92 18 104 28 Q114 36 108 44 M118 24 Q128 30 122 40" {...line} stroke={PINK_DEEP} strokeWidth={2.6} opacity={0.75} />
            <Circle cx={96} cy={14} r={2.6} fill="#fff" opacity={0.9} />
          </G>
        ),
      };
    case 'bubu-03': // candy stick: blue swirl on a paper cone
      return {
        face: [...cheeks(p), eye(74, 112, 'el'), eye(126, 112, 'er'), smile],
        front: (
          <G key="stick">
            {limb(COLOR_LAYER, 'arm', 146, 142, 160, 134, 14)}
            {cone(152, 112, 28, 46, 'cone')}
            <Circle cx={166} cy={104} r={15} fill={BLUE_DEEP} {...ink} />
            <Circle cx={166} cy={90} r={11.5} fill={BLUE} {...ink} />
            <Circle cx={166} cy={78} r={8} fill={BLUE_DEEP} {...ink} />
            <Path d="M156 108 Q166 100 176 106 M158 94 Q166 88 174 93" {...line} stroke="#fff" strokeWidth={2.6} opacity={0.9} />
          </G>
        ),
      };
    case 'bubu-04': // heart sunglasses, grin
      return {
        face: [
          ...cheeks(p),
          openMouth,
          <G key="specs">
            <Path d="M52 104 L62 107 M148 104 L138 107" {...line} strokeWidth={3.4} />
            <Path d="M86 106 Q100 99 114 106" {...line} strokeWidth={3.4} />
            <Path d={heart(75, 112, 13)} fill={PINK_DEEP} {...ink} />
            <Path d={heart(125, 112, 13)} fill={PINK_DEEP} {...ink} />
            <Path d="M66 104 Q69 99 74 100 M116 104 Q119 99 124 100" {...line} stroke="#fff" strokeWidth={3} opacity={0.85} />
          </G>,
        ],
      };
    case 'bubu-05': // lilac star hairclip + sparkles
      return {
        face: [
          ...cheeks(p),
          eye(74, 112, 'el'),
          eye(126, 112, 'er'),
          <Path key="smile2" d="M93 121 Q100 131 107 121" {...line} strokeWidth={3.2} />,
        ],
        front: (
          <G key="clip">
            <Path d={star(62, 62, 17)} fill={LILAC_DEEP} {...ink} />
            <Circle cx={62} cy={63} r={3.4} fill="#fff" opacity={0.9} />
            <Path d={sparkle(34, 40, 9)} fill={GOLD} />
            <Path d={sparkle(168, 52, 10)} fill={GOLD} />
            <Path d={sparkle(30, 150, 7)} fill={PINK_DEEP} opacity={0.8} />
            <Path d={sparkle(172, 150, 6)} fill={LILAC_DEEP} />
          </G>
        ),
      };
    case 'bubu-06': // flower crown around the ears
      return {
        face: [...cheeks(p), eye(74, 112, 'el'), eye(126, 112, 'er'), smile],
        front: (
          <G key="crown">
            <Ellipse cx={64} cy={55} rx={9} ry={4.5} fill={PALETTE.leaf} stroke={INK} strokeWidth={2.4} transform="rotate(-25 64 55)" />
            <Ellipse cx={136} cy={55} rx={9} ry={4.5} fill={PALETTE.leaf} stroke={INK} strokeWidth={2.4} transform="rotate(25 136 55)" />
            {flower(50, 64, 7.5, PINK, 'f1')}
            {flower(76, 50, 8, BLUE, 'f2')}
            {flower(100, 46, 9, '#fff', 'f3')}
            {flower(124, 50, 8, LILAC, 'f4')}
            {flower(150, 64, 7.5, PINK, 'f5')}
          </G>
        ),
      };
    case 'bubu-07': // dreamy: sleepy eyes hugging a cloud pillow
      return {
        face: [
          ...cheeks(p),
          sleepyEye(74, 112, 'el'),
          sleepyEye(126, 112, 'er'),
          <Ellipse key="m" cx={100} cy={125} rx={3.5} ry={4.5} fill={PEACH} stroke={INK} strokeWidth={2.5} />,
          <Path key="z" d="M150 78 h11 l-11 11 h11 M168 60 h8 l-8 8 h8" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
        ],
        front: (
          <G key="pillow">
            <Circle cx={66} cy={156} r={17} fill="#fff" {...ink} />
            <Circle cx={134} cy={156} r={17} fill="#fff" {...ink} />
            <Circle cx={90} cy={150} r={21} fill="#fff" {...ink} />
            <Circle cx={112} cy={152} r={20} fill="#fff" {...ink} />
            <Path d="M70 166 Q100 176 132 166" {...line} stroke={BLUE_DEEP} strokeWidth={3} opacity={0.8} />
            {limb(COLOR_LAYER, 'armL', 46, 138, 64, 150, 14)}
            {limb(COLOR_LAYER, 'armR', 154, 138, 136, 150, 14)}
          </G>
        ),
      };
    case 'bubu-08': // sweet tooth: tiny ice-cream cone, tongue out
      return {
        face: [
          ...cheeks(p),
          eye(74, 112, 'el'),
          eye(126, 112, 'er'),
          <Path key="m" d="M94 122 Q100 128 106 122" {...line} strokeWidth={3.2} />,
          <Path key="tg" d="M101 126 Q101 138 109 138 Q117 138 116 130 Q113 126 107 126Z" fill={TONGUE} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />,
        ],
        front: (
          <G key="ice">
            {limb(COLOR_LAYER, 'arm', 54, 146, 40, 142, 14)}
            {cone(22, 128, 30, 42, 'cone')}
            <Circle cx={37} cy={122} r={17} fill={PINK} {...ink} />
            <Path d="M22 126 Q26 138 31 128 Q35 140 40 128 Q44 138 51 126" fill={PINK} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
            <Circle cx={37} cy={103} r={6} fill="#EF6F8B" {...ink} />
            <Path d="M31 116 q0 -5 5 -6" {...line} stroke="#fff" strokeWidth={2.6} />
          </G>
        ),
      };
    case 'bubu-09': // balloon: holding a heart balloon, happy eyes
      return {
        dx: -12,
        face: [...cheeks(p), happyEye(74, 114, 'el'), happyEye(126, 114, 'er'), openMouth],
        front: (
          <G key="balloon">
            <Path d="M184 88 C186 104 168 114 166 124" {...line} strokeWidth={2.4} />
            <Path d={heart(184, 62, 17)} fill={PINK_DEEP} {...ink} />
            <Path d="M171 52 Q173 45 180 45" {...line} stroke="#fff" strokeWidth={3} opacity={0.85} />
            <Path d="M180 86 L188 86 L184 81Z" fill={PINK_DEEP} {...ink} strokeWidth={2.4} />
            {limb(COLOR_LAYER, 'arm', 150, 140, 164, 126, 14)}
          </G>
        ),
      };
    default: // bubu-01 classic: pink bow, shy smile
      return {
        face: [
          ...cheeks(p),
          eye(74, 114, 'el'),
          eye(126, 114, 'er'),
          <Path key="smile" d="M94 124 Q100 130 106 124" {...line} strokeWidth={3.2} />,
        ],
        front: bow(138, 50, 1, 18),
      };
  }
}

/** Neutral, accessory-free Bloom face on a grey-lilac disc: shown when the avatar is not set or the id is unknown. */
function fallbackArt(p: MascotPalette): Art {
  return { face: [...cheeks(p), eye(74, 114, 'el'), eye(126, 114, 'er'), <Path key="smile" d="M94 124 Q100 130 106 124" {...line} strokeWidth={3.2} />] };
}

const FALLBACK_BG = '#EEEAF6';

/** Square 200x200 avatar art; returns SVG elements to place inside a viewBox="0 0 200 200" <Svg>. */
export function avatarArt(id: string | null | undefined): React.ReactElement {
  const known = isAvatarId(id);
  const art = known ? artFor(id, PALETTE) : fallbackArt(PALETTE);
  const bg = known ? BACKGROUNDS[id] : FALLBACK_BG;
  return (
    <G>
      <Rect x={0} y={0} width={200} height={200} fill={bg} />
      <Circle cx={40} cy={36} r={30} fill="#fff" opacity={0.35} />
      <Circle cx={168} cy={170} r={36} fill="#fff" opacity={0.3} />
      <G transform={`translate(${100 + (art.dx ?? 0)} 106) scale(0.97) translate(-100 -100)`}>
        {art.behind}
        {mascotBody(COLOR_LAYER, PALETTE, { feet: false, sprout: art.sprout !== false })}
        {art.face}
        {art.front}
      </G>
    </G>
  );
}

export function AvatarArt({ id }: { id: string | null | undefined }) {
  return avatarArt(id);
}
