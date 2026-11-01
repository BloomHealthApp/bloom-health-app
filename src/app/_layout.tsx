import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { isTablet } from '@/lib/device';
import { SIGNED_IN_ROUTES } from '@/lib/protectedRoutes';
import { configureNotifications } from '@/notifications/expoAdapter';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { PeriodReminderSync } from '@/features/PeriodReminderSync';
import { DataProvider } from '@/providers/DataProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useWidgetSignedOut, WidgetSync } from '@/widgets/WidgetSync';
import { Loading } from '@/components/ui';
import { Platform, useWindowDimensions, View } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

function Shell() {
  const { status, user } = useAuth();
  const { theme, setThemeName } = useTheme();

  useWidgetSignedOut(status, theme.name, theme.isDark);

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
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: theme.colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      {/* Sends the user to `index` if a screen here is open when they stop being signed in. */}
      <Stack.Protected guard={status === 'signedIn'}>
        {SIGNED_IN_ROUTES.map((name) => <Stack.Screen key={name} name={name} />)}
      </Stack.Protected>
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
            <SystemBars />
            <Shell />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function SystemBars() {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const fullScreen = isTablet(width, height);
  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} hidden={fullScreen} />
      {Platform.OS === 'android' ? <NavigationBar hidden={fullScreen} /> : null}
    </>
  );
}
