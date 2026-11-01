import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Defs, LinearGradient, RadialGradient, Rect, Stop, Svg } from 'react-native-svg';
import type { ThemeColors } from '@/theme/themes';
import { useTheme } from '@/theme/ThemeProvider';

/** Layered shadows lift a glass surface off the page: a wide soft one and a tight one close to its edge. */
export const glassShadow = (isDark: boolean) =>
  isDark ? '0 12px 28px rgba(0,0,0,0.45), 0 2px 5px rgba(0,0,0,0.35)' : '0 10px 24px rgba(30,40,50,0.14), 0 2px 5px rgba(30,40,50,0.1)';

interface LayerArgs {
  width: number;
  height: number;
  radius: number;
  colors: ThemeColors;
  isDark: boolean;
  /** a coloured fill: use white light only, so the fill keeps its colour */
  onFill?: boolean;
}

/** The SVG layers of a glass surface: lower shading, inner glow and a top gloss. There's deliberately no rim or border. */
export function glassLayers({ width, height, radius, colors: c, isDark, onFill }: LayerArgs): React.ReactElement {
  const r = Math.min(radius, width / 2, height / 2);
  const id = onFill ? 'glassFill' : 'glass';
  const shade = onFill ? 0.2 : isDark ? 0.32 : 0.08;
  const gloss = onFill ? 0.32 : isDark ? 0.13 : 0.5;
  return (
    <>
      <Defs>
        <LinearGradient id={`${id}Shade`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0.68} stopColor="#000000" stopOpacity={0} />
          <Stop offset={1} stopColor="#000000" stopOpacity={shade} />
        </LinearGradient>
        <LinearGradient id={`${id}Gloss`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor="#FFFFFF" stopOpacity={gloss} />
          <Stop offset={0.55} stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id={`${id}Glow`} cx="85%" cy="100%" r="65%">
          <Stop offset={0} stopColor={onFill ? '#FFFFFF' : c.glassGlow} stopOpacity={onFill ? 0.18 : isDark ? 0.26 : 0.22} />
          <Stop offset={1} stopColor={onFill ? '#FFFFFF' : c.glassGlow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect testID="glass-layer-shade" width={width} height={height} rx={r} fill={`url(#${id}Shade)`} />
      <Rect width={width} height={height} rx={r} fill={`url(#${id}Glow)`} />
      <Rect width={width} height={height} rx={r} fill={`url(#${id}Gloss)`} />
    </>
  );
}

/**
 * Thick-glass depth for a rounded surface. Place it as the first child: it fills the surface and ignores touches.
 */
export function GlassLayer({ radius, onFill }: { radius: number; onFill?: boolean }) {
  const { theme } = useTheme();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  return (
    <View
      testID="glass-layer"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
      onLayout={({ nativeEvent: { layout } }) => {
        if (layout.width !== size?.width || layout.height !== size?.height) setSize({ width: layout.width, height: layout.height });
      }}
    >
      {size && size.width > 0 && size.height > 0 ? (
        <Svg width={size.width} height={size.height}>
          {glassLayers({ ...size, radius, colors: theme.colors, isDark: theme.isDark, onFill })}
        </Svg>
      ) : null}
    </View>
  );
}
