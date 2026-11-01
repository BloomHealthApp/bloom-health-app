import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAvatarPrompt } from '@/avatars/avatarPrompt';
import { FloatingTabBar, tabBarSpace } from '@/components/FloatingTabBar';
import { TabBarSpaceContext } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { status, user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const avatarPrompt = useAvatarPrompt(status === 'signedIn' ? user : null);
  if (status !== 'signedIn') return <Redirect href="/(auth)/welcome" />;
  // First sign-up: pick an avatar once (skippable). Waiting for the one-time flag read avoids flashing the tabs.
  if (avatarPrompt === 'checking') return null;
  if (avatarPrompt === 'show') return <Redirect href="/choose-avatar" />;
  return (
    <TabBarSpaceContext.Provider value={tabBarSpace(insets.bottom)}>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: theme.colors.bg } }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarAccessibilityLabel: 'Home tab' }} />
        <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarAccessibilityLabel: 'Progress tab' }} />
        <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarAccessibilityLabel: 'Calendar tab' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarAccessibilityLabel: 'Profile tab' }} />
      </Tabs>
    </TabBarSpaceContext.Provider>
  );
}
