import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configureNotifications } from '@/notifications/expoAdapter';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { PeriodReminderSync } from '@/features/PeriodReminderSync';
import { DataProvider } from '@/providers/DataProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useWidgetSignedOut, WidgetSync } from '@/widgets/WidgetSync';
import { Loading } from '@/components/ui';
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

function Shell() {
  const { status, user } = useAuth();
  const { theme, setThemeName } = useTheme();

  useWidgetSignedOut(status, theme.name);

  // Server profile theme is the cross-device preference once signed in.
  useEffect(() => {
    if (user?.theme) setThemeName(user.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.theme]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center' }}>
        <Loading />
      </View>
    );
  }
  const stack = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="choose-avatar" />
      <Stack.Screen name="periods" />
    </Stack>
  );
  // Data layer (SQLite + sync engine) only exists for a signed-in user.
  return status === 'signedIn' ? (
    <DataProvider>
      <WidgetSync />
      <PeriodReminderSync />
      {stack}
    </DataProvider>
  ) : stack;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 0, retry: false } } }));
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <AuthProvider onSignedOut={() => qc.clear()}>
            <ThemedStatusBar />
            <Shell />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  return <StatusBar style="dark" />;
}
