import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Mascot } from '@/components/Mascot';
import { ThemePicker } from '@/components/ThemePicker';
import { AppText, Button, Screen } from '@/components/ui';
import { DISCLAIMER } from '@/lib/messages';
import { spacing } from '@/theme/tokens';

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl }}>
        <Mascot mood="cheer" size={180} />
        <AppText variant="title" accent style={{ textAlign: 'center' }}>Bloom Health</AppText>
        <AppText muted style={{ textAlign: 'center' }}>
          A gentle little habit and wellness tracker for two. Small steps, kind streaks, and a bear who is proud of you.
        </AppText>
      </View>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" muted>Pick a look (you can change it any time)</AppText>
        <ThemePicker />
      </View>
      <View style={{ gap: spacing.sm }}>
        <Button title="Create account" onPress={() => router.push('/(auth)/signup')} />
        <Button title="Sign in" variant="secondary" onPress={() => router.push('/(auth)/signin')} />
      </View>
      <AppText variant="caption" muted style={{ textAlign: 'center' }}>{DISCLAIMER}</AppText>
    </Screen>
  );
}
