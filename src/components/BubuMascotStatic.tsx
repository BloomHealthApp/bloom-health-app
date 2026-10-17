import React from 'react';
import Svg from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { MascotArt, mascotPalette } from './mascotArt';
import type { MascotMood } from './mascotTypes';

/** Original Bubu sticker (mochi bunny-bear blob). Pure SVG, no animation: also the reduced-motion render. */
export function BubuMascotStatic({ mood = 'happy', size = 120 }: { mood?: MascotMood; size?: number }) {
  const { theme } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <MascotArt mood={mood} palette={mascotPalette(theme.colors)} />
    </Svg>
  );
}
