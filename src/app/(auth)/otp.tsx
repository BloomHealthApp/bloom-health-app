import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { TextInput } from 'react-native';
import { ApiError, NetworkError } from '@/api/errors';
import { BubuMascot } from '@/components/BubuMascot';
import { AppText, Button, ErrorBanner, Screen } from '@/components/ui';
import { USE_MOCK_API } from '@/config';
import { useAuth } from '@/providers/AuthProvider';
import { fonts, MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export default function OtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, requestOtp } = useAuth();
  const { theme } = useTheme();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const submit = async (c = code) => {
    if (c.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(email ?? '', c);
      // Signing in swaps the root tree; the index/auth layouts redirect to the tabs.
    } catch (e) {
      if (e instanceof NetworkError) setError('No connection. Check your internet and try again.');
      else if (e instanceof ApiError && e.status === 429) setError('Too many attempts. Please wait a few minutes and request a new code.');
      else if (e instanceof ApiError && e.status === 401) setError('That code is not valid or has expired.');
      else setError('Something went wrong. Please try again.');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  // The code screen only makes sense after an email was entered.
  if (!email) return <Redirect href="/(auth)/email" />;

  return (
    <Screen>
      <BubuMascot mood="sleepy" size={110} />
      <AppText variant="title">Enter your code</AppText>
      <AppText muted>We sent a 6-digit code to {email}. It expires in 10 minutes.</AppText>
      <TextInput
        value={code}
        onChangeText={(t) => {
          const d = t.replace(/\D/g, '').slice(0, 6);
          setCode(d);
          if (d.length === 6) void submit(d);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="------"
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel="6-digit code"
        style={{ minHeight: MIN_TOUCH + 12, textAlign: 'center', letterSpacing: 10, borderRadius: radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: spacing.lg, fontFamily: fonts.heavy, fontSize: 28, color: theme.colors.text }}
      />
      {error ? <ErrorBanner message={error} /> : null}
      <Button title="Verify" onPress={() => submit()} disabled={code.length !== 6} loading={busy} />
      <Button
        title={resent ? 'Code re-sent' : 'Send a new code'}
        variant="ghost"
        disabled={resent}
        onPress={async () => {
          try {
            await requestOtp(email ?? '');
            setResent(true);
          } catch {
            setError('Could not resend the code.');
          }
        }}
      />
      {USE_MOCK_API ? <AppText variant="caption" muted>Demo mode: the code is 123456.</AppText> : null}
    </Screen>
  );
}
