import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { MIN_TOUCH, spacing } from '@/theme/tokens';
import { GlassLayer, glassShadow } from './GlassLayer';
import { AppText } from './ui';
import { useTheme } from '@/theme/ThemeProvider';

export function ScreenHeader({ title, icon, right }: { title: string; icon?: React.ReactNode; right?: React.ReactNode }) {
  const router = useRouter();
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, minHeight: 60, gap: spacing.xs }}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => ({ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: theme.glass, boxShadow: glassShadow(theme.isDark), opacity: pressed ? 0.7 : 1 })}
      >
        <GlassLayer radius={999} />
        <AppText variant="heading" accent>‹</AppText>
      </Pressable>
      {icon ? <View style={{ marginRight: spacing.sm }}>{icon}</View> : null}
      <AppText variant="heading" style={{ flex: 1 }} accessibilityRole="header" numberOfLines={1}>{title}</AppText>
      {right}
    </View>
  );
}
