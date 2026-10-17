import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { TextInput } from 'react-native';
import { BubuMascot } from '@/components/BubuMascot';
import { AppText, Button, ErrorBanner, Screen } from '@/components/ui';
import { USE_MOCK_API } from '@/config';
import { ApiError, NetworkError } from '@/api/errors';
import { useAuth } from '@/providers/AuthProvider';
import { fonts, MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailScreen() {
  const router = useRouter();
  const { requestOtp } = useAuth();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = EMAIL_RE.test(email.trim());

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestOtp(email);
      router.push({ pathname: '/(auth)/otp', params: { email: email.trim().toLowerCase() } });
    } catch (e) {
      setError(e instanceof NetworkError ? 'No connection. Check your internet and try again.' : e instanceof ApiError && e.code === 'rate_limited' ? 'Too many requests. Please wait a moment.' : 'Could not send the code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BubuMascot mood="happy" size={110} />
      <AppText variant="title">Sign in</AppText>
      <AppText muted>Enter your email. If it has been invited, we will send a 6-digit code.</AppText>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="you@example.com"
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel="Email address"
        returnKeyType="send"
        onSubmitEditing={() => valid && !busy && submit()}
        style={{ minHeight: MIN_TOUCH + 8, borderRadius: radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: spacing.lg, fontFamily: fonts.semibold, fontSize: 16, color: theme.colors.text }}
      />
      {error ? <ErrorBanner message={error} /> : null}
      <Button title="Send code" onPress={submit} disabled={!valid} loading={busy} />
      {USE_MOCK_API ? <AppText variant="caption" muted>Demo mode: use anu@example.com (owner) or aman@example.com (viewer). The code is 123456.</AppText> : null}
    </Screen>
  );
}
