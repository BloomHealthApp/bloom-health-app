import type { BottomTabBarProps } from 'expo-router/build/layouts/TabsClient';
import React from 'react';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Circle, Path, Rect, Svg } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassLayer, glassShadow } from './GlassLayer';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const BAR_HEIGHT = 56;
const BAR_WIDTH = 272;
const BAR_GAP = spacing.sm;

/** How much of the bottom of a tab screen the floating bar covers. */
export const tabBarSpace = (bottomInset: number) => BAR_HEIGHT + BAR_GAP + Math.max(bottomInset, BAR_GAP);

type TabIconName = 'home' | 'chart' | 'calendar' | 'gear';
const ROUTE_ICONS: Record<string, TabIconName> = { index: 'home', progress: 'chart', calendar: 'calendar', settings: 'gear' };

type TabBarProps = Pick<BottomTabBarProps, 'state' | 'descriptors' | 'emitter' | 'navigateToTab'>;

function TabIcon({ name, color, focused }: { name: TabIconName; color: string; focused: boolean }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={23} height={23} viewBox="0 0 28 28" accessibilityElementsHidden importantForAccessibility="no">
      {name === 'home' ? (
        <>
          <Path d="M3.5 12.5 14 4l10.5 8.5" {...common} />
          <Path d="M6.5 11.5V24h15V11.5M11 24v-7h6v7" {...common} />
        </>
      ) : name === 'chart' ? (
        <>
          <Path d="M4 23.5h20" {...common} />
          <Rect x="5.5" y="14" width="4" height="8" rx="1.5" {...common} />
          <Rect x="12" y="9.5" width="4" height="12.5" rx="1.5" {...common} />
          <Rect x="18.5" y="5" width="4" height="17" rx="1.5" {...common} />
        </>
      ) : name === 'calendar' ? (
        <>
          <Rect x="4" y="6.5" width="20" height="18" rx="3" {...common} />
          <Path d="M9 4v5M19 4v5M4 11h20M9 15h.1M14 15h.1M19 15h.1M9 19h.1M14 19h.1" {...common} />
        </>
      ) : (
        <>
          <Circle cx="14" cy="14" r="3.1" {...common} />
          <Path d="M14 3.5v3M14 21.5v3M3.5 14h3M21.5 14h3M6.6 6.6l2.1 2.1M19.3 19.3l2.1 2.1M21.4 6.6l-2.1 2.1M8.7 19.3l-2.1 2.1" {...common} />
          <Circle cx="14" cy="14" r="8.3" {...common} />
        </>
      )}
      {focused && name === 'home' ? <Circle cx="14" cy="14" r="1.2" fill={color} /> : null}
    </Svg>
  );
}

/** A rounded bar floating above the page, with a highlighted pill on the active tab. It floats over the page, so tab screens add `tabBarSpace` at the bottom through `TabBarSpaceContext`. */
export function FloatingTabBar({ state, descriptors, emitter, navigateToTab }: TabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: Math.max(insets.bottom, BAR_GAP) }}>
      <View
        accessibilityRole="tablist"
        style={{ flexDirection: 'row', height: BAR_HEIGHT, width: BAR_WIDTH, maxWidth: '100%', padding: 4, gap: 2, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: Platform.OS === 'ios' ? theme.glass : `${c.surface}E6`, boxShadow: glassShadow(theme.isDark) }}
      >
        {Platform.OS === 'ios' ? <BlurView intensity={40} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
        <GlassLayer radius={radius.pill} />
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const { title, tabBarAccessibilityLabel } = descriptors[route.key].options;
          const onPress = () => {
            const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tabBarAccessibilityLabel ?? title ?? route.name}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: focused ? c.tint : 'transparent' }}
            >
              {focused ? <GlassLayer radius={radius.pill} onFill /> : null}
              <TabIcon name={ROUTE_ICONS[route.name] ?? 'home'} color={focused ? c.accent : c.textMuted} focused={focused} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
