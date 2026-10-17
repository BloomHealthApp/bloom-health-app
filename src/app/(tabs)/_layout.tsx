import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import { useAvatarPrompt } from '@/avatars/avatarPrompt';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text accessibilityElementsHidden importantForAccessibility="no" style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>;
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
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon glyph="🏡" focused={focused} />, tabBarAccessibilityLabel: 'Home tab' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: ({ focused }) => <TabIcon glyph="📈" focused={focused} />, tabBarAccessibilityLabel: 'Progress tab' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: ({ focused }) => <TabIcon glyph="🗓️" focused={focused} />, tabBarAccessibilityLabel: 'Calendar tab' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ focused }) => <TabIcon glyph="⚙️" focused={focused} />, tabBarAccessibilityLabel: 'Settings tab' }} />
    </Tabs>
  );
}
