import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { MIN_TOUCH, spacing } from '@/theme/tokens';
import { AppText } from './ui';

export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, minHeight: 52 }}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' }}
      >
        <AppText variant="heading" accent>‹</AppText>
      </Pressable>
      <AppText variant="heading" style={{ flex: 1 }} accessibilityRole="header" numberOfLines={1}>{title}</AppText>
      {right}
    </View>
  );
}
