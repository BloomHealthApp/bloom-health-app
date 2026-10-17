import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './ui';

export function ProgressRing({ percent, size = 140, stroke = 14, label, sublabel }: { percent: number; size?: number; stroke?: number; label?: string; sublabel?: string }) {
  const { theme } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Today's completion ${Math.round(p)} percent`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p) }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.colors.tint} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(c * p) / 100} ${c}`}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <AppText variant="big" accent>{label ?? `${Math.round(p)}%`}</AppText>
      {sublabel ? <AppText variant="caption" muted>{sublabel}</AppText> : null}
    </View>
  );
}
