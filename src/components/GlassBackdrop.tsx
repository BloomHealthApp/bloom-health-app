import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Defs, RadialGradient, Rect, Stop, Svg } from 'react-native-svg';
import { GLOW_OPACITY } from '@/theme/themes';
import { useTheme } from '@/theme/ThemeProvider';

const glow = (id: string, cx: string, cy: string, color: string, opacity: number) => (
  <RadialGradient id={id} cx={cx} cy={cy} r="70%">
    <Stop offset={0} stopColor={color} stopOpacity={opacity} />
    <Stop offset={1} stopColor={color} stopOpacity={0} />
  </RadialGradient>
);

/** Soft theme-coloured glows behind a screen, which give translucent panels something to show through. */
export function GlassBackdrop() {
  const { theme } = useTheme();
  const opacity = theme.isDark ? GLOW_OPACITY.dark : GLOW_OPACITY.light;
  return (
    <View testID="glass-backdrop" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          {glow('backdropTop', '90%', '5%', theme.colors.primary, opacity)}
          {glow('backdropBottom', '5%', '95%', theme.colors.accent, opacity * 0.7)}
        </Defs>
        <Rect width="100%" height="100%" fill="url(#backdropTop)" />
        <Rect width="100%" height="100%" fill="url(#backdropBottom)" />
      </Svg>
    </View>
  );
}
