import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useAvatarPrompt } from '@/avatars/avatarPrompt';
import { AppIcon } from '@/icons/AppIcon';
import type { IconName } from '@/icons/iconArt';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <View style={{ opacity: focused ? 1 : 0.55 }}><AppIcon name={name} size={28} /></View>;
}

export default function TabsLayout() {
  const { status, user } = useAuth();
  const { theme } = useTheme();
  const avatarPrompt = useAvatarPrompt(status === 'signedIn' ? user : null);
  if (status !== 'signedIn') return <Redirect href="/(auth)/welcome" />;
  // First sign-up: pick an avatar once (skippable). Waiting for the one-time flag read avoids flashing the tabs.
  if (avatarPrompt === 'checking') return null;
  if (avatarPrompt === 'show') return <Redirect href="/choose-avatar" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12 },
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, minHeight: 60 },
        tabBarItemStyle: { minHeight: 48 },
        sceneStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />, tabBarAccessibilityLabel: 'Home tab' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: ({ focused }) => <TabIcon name="chart" focused={focused} />, tabBarAccessibilityLabel: 'Progress tab' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />, tabBarAccessibilityLabel: 'Calendar tab' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ focused }) => <TabIcon name="gear" focused={focused} />, tabBarAccessibilityLabel: 'Settings tab' }} />
    </Tabs>
  );
}
