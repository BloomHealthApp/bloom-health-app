import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

const STROKE = 1.25;
const SHEEN = { light: 0.4, dark: 0.1, onFill: 0.22 };

/**
 * The bright diagonal edge and top sheen on a glass surface. Place it as the first child of a rounded surface: it fills the surface and ignores touches.
 * `onFill` is for coloured fills, where only a white sheen is drawn so the fill keeps its colour.
 */
export function GlassEdge({ radius, onFill }: { radius: number; onFill?: boolean }) {
  const { theme } = useTheme();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const c = theme.colors;
  const id = onFill ? 'glassEdgeFill' : 'glassEdge';
  const sheen = onFill ? SHEEN.onFill : theme.isDark ? SHEEN.dark : SHEEN.light;
  const stops = onFill
    ? [{ color: '#FFFFFF', opacity: 0.7 }, { color: '#FFFFFF', opacity: 0.08 }, { color: '#FFFFFF', opacity: 0.3 }]
    : [{ color: c.edgeHighlight, opacity: theme.isDark ? 0.6 : 1 }, { color: c.edgeShade, opacity: 1 }, { color: c.edgeGlow, opacity: theme.isDark ? 0.75 : 1 }];
  return (
    <View
      testID="glass-edge"
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
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              {stops.map((s, i) => (
                <Stop key={i} offset={i / 2} stopColor={s.color} stopOpacity={s.opacity} />
              ))}
            </LinearGradient>
            <LinearGradient id={`${id}Sheen`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset={0} stopColor="#FFFFFF" stopOpacity={sheen} />
              <Stop offset={0.55} stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width={size.width} height={size.height} rx={Math.min(radius, size.width / 2, size.height / 2)} fill={`url(#${id}Sheen)`} />
          <Rect
            testID="glass-edge-border"
            x={STROKE / 2}
            y={STROKE / 2}
            width={size.width - STROKE}
            height={size.height - STROKE}
            rx={Math.max(0, Math.min(radius, size.width / 2, size.height / 2) - STROKE / 2)}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={STROKE}
          />
        </Svg>
      ) : null}
    </View>
  );
}
