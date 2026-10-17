import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';

// Always start the sign-in flow at the welcome screen (otherwise the stack may open on another route).
export const unstable_settings = { initialRouteName: 'welcome' };

export default function AuthLayout() {
  const { status } = useAuth();
  const { theme } = useTheme();
  if (status === 'signedIn') return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }} />;
}
