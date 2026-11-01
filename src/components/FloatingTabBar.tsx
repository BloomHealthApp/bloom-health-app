import type { BottomTabBarProps } from 'expo-router/build/layouts/TabsClient';
import React from 'react';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Circle, Path, Rect, Svg } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassLayer, glassShadow } from './GlassLayer';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const BAR_HEIGHT = 52;
const BAR_WIDTH = 248;
const BAR_GAP = spacing.sm;

/** How much of the bottom of a tab screen the floating bar covers. */
export const tabBarSpace = (bottomInset: number) => BAR_HEIGHT + BAR_GAP + Math.max(bottomInset, BAR_GAP);

type TabIconName = 'home' | 'chart' | 'calendar' | 'person';
const ROUTE_ICONS: Record<string, TabIconName> = { index: 'home', progress: 'chart', calendar: 'calendar', profile: 'person' };

type TabBarProps = Pick<BottomTabBarProps, 'state' | 'descriptors' | 'emitter' | 'navigateToTab'>;

function TabIcon({ name, color }: { name: TabIconName; color: string }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={21} height={21} viewBox="0 0 28 28" accessibilityElementsHidden importantForAccessibility="no">
      {name === 'home' ? (
        <>
          <Circle cx="14" cy="6.2" r="2.2" {...common} strokeWidth={1.9} />
          <Path d="M13.2 15.5C12.8 11 9 3.2 2.6 3.2 2 9.5 3 14.5 8 14.7c2 .1 4 .1 5.2.8ZM14.8 15.5C15.2 11 19 3.2 25.4 3.2 26 9.5 25 14.5 20 14.7c-2 .1-4 .1-5.2.8Z" {...common} strokeWidth={1.9} />
          <Path d="M12.8 17.5c-1.8-1.9-6.8-2-9 .5-1.8 2.3-1.2 5 .8 7.4 2.4-1.6 6.9-.9 8.2-4.9.4-1.1.4-2.2 0-3ZM15.2 17.5c1.8-1.9 6.8-2 9 .5 1.8 2.3 1.2 5-.8 7.4-2.4-1.6-6.9-.9-8.2-4.9-.4-1.1-.4-2.2 0-3Z" {...common} strokeWidth={1.9} />
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
          <Circle cx="14" cy="9.5" r="5" {...common} />
          <Path d="M4.5 24.5c.8-5.2 4.6-8 9.5-8s8.7 2.8 9.5 8" {...common} />
        </>
      )}
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
              <TabIcon name={ROUTE_ICONS[route.name] ?? 'home'} color={focused ? c.accent : c.textMuted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
