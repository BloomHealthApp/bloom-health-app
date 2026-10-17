import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import type { MascotMood } from './mascotTypes';

const BODY = '#FFEFE2';
const INK = '#5A3B4B';

/** Original Bubu: round blob bear, blush cheeks, little sprout. Pure SVG, no animation. */
export function BubuMascotStatic({ mood = 'happy', size = 120 }: { mood?: MascotMood; size?: number }) {
  const { theme } = useTheme();
  const blush = theme.colors.tint;
  const leaf = theme.colors.success;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {/* sprout */}
      <Path d="M100 38 C100 28 100 24 100 20" stroke={leaf} strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M100 24 C88 8 72 14 74 28 C86 30 96 28 100 24Z" fill={leaf} />
      <Path d="M100 24 C112 6 130 12 126 28 C114 30 104 28 100 24Z" fill={leaf} opacity={0.8} />
      {/* arms up when cheering */}
      {mood === 'cheer' && (
        <G fill={BODY} stroke={INK} strokeWidth={4}>
          <Circle cx={36} cy={104} r={16} />
          <Circle cx={164} cy={104} r={16} />
        </G>
      )}
      {/* ears */}
      <Circle cx={52} cy={58} r={24} fill={BODY} stroke={INK} strokeWidth={4} />
      <Circle cx={148} cy={58} r={24} fill={BODY} stroke={INK} strokeWidth={4} />
      <Circle cx={52} cy={58} r={11} fill={blush} />
      <Circle cx={148} cy={58} r={11} fill={blush} />
      {/* body blob */}
      <Path
        d="M100 50 C148 50 176 84 176 126 C176 166 144 188 100 188 C56 188 24 166 24 126 C24 84 52 50 100 50Z"
        fill={BODY}
        stroke={INK}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      {/* cheeks */}
      <Ellipse cx={58} cy={134} rx={15} ry={10} fill={theme.colors.primary} opacity={0.45} />
      <Ellipse cx={142} cy={134} rx={15} ry={10} fill={theme.colors.primary} opacity={0.45} />
      {/* nose */}
      <Ellipse cx={100} cy={122} rx={7} ry={5} fill={INK} />
      <Face mood={mood} />
    </Svg>
  );
}

function Face({ mood }: { mood: MascotMood }) {
  const stroke = { stroke: INK, strokeWidth: 5, strokeLinecap: 'round' as const, fill: 'none' };
  switch (mood) {
    case 'sleepy':
      return (
        <G>
          <Path d="M64 104 Q74 112 84 104" {...stroke} />
          <Path d="M116 104 Q126 112 136 104" {...stroke} />
          <Ellipse cx={100} cy={146} rx={6} ry={5} fill={INK} />
          <Path d="M150 70 h14 l-14 14 h14" stroke={INK} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </G>
      );
    case 'cheer':
      return (
        <G>
          <Path d="M62 108 Q74 94 86 108" {...stroke} />
          <Path d="M114 108 Q126 94 138 108" {...stroke} />
          <Path d="M82 136 Q100 166 118 136 Z" fill={INK} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <Path d="M168 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4Z" fill={'#F6C453'} />
          <Path d="M28 44 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3Z" fill={'#F6C453'} />
        </G>
      );
    case 'sad':
      return (
        <G>
          <Circle cx={74} cy={106} r={6} fill={INK} />
          <Circle cx={126} cy={106} r={6} fill={INK} />
          <Path d="M62 92 L84 98" {...stroke} strokeWidth={4} />
          <Path d="M138 92 L116 98" {...stroke} strokeWidth={4} />
          <Path d="M86 150 Q100 138 114 150" {...stroke} />
          <Path d="M130 118 q-5 9 0 12 q5 -3 0 -12Z" fill={'#8EC5E8'} />
        </G>
      );
    default:
      return (
        <G>
          <Circle cx={74} cy={106} r={6.5} fill={INK} />
          <Circle cx={126} cy={106} r={6.5} fill={INK} />
          <Circle cx={76} cy={103.5} r={2} fill="#fff" />
          <Circle cx={128} cy={103.5} r={2} fill="#fff" />
          <Path d="M86 140 Q100 154 114 140" {...stroke} />
        </G>
      );
  }
}

