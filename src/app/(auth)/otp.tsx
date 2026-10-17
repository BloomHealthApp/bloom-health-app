import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { ApiError, NetworkError } from '@/api/errors';
import { BubuMascot } from '@/components/BubuMascot';
import { AppText, Button, ErrorBanner, Screen } from '@/components/ui';
import { USE_MOCK_API } from '@/config';
import { authErrorMessage } from '@/lib/authForm';
import { useAuth } from '@/providers/AuthProvider';
import { fonts, MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const RESEND_COOLDOWN_MS = 30_000;

type Params = { challengeId?: string; purpose?: string; name?: string; phone?: string; email?: string; identifier?: string };

export default function OtpScreen() {
  const p = useLocalSearchParams<Params>();
  const { verifyOtp, requestSignUp, requestSignIn } = useAuth();
  const { theme } = useTheme();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  // A resend returns a new challengeId; it replaces the one from the route params.
  const [freshChallenge, setFreshChallenge] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const isSignUp = p.purpose === 'signup';
  const challengeId = freshChallenge ?? p.challengeId;

  const submit = async (c = code) => {
    if (c.length !== 6 || !challengeId) return;
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(challengeId, c);
      // Signing in swaps the root tree; the index/auth layouts redirect to the tabs.
    } catch (e) {
      if (e instanceof NetworkError) setError('No connection. Check your internet and try again.');
      else if (e instanceof ApiError && e.status === 429) setError('Too many attempts. Please wait a few minutes and request a new code.');
      else if (e instanceof ApiError && e.status === 401) setError('That code is not valid or has expired.');
      else if (e instanceof ApiError && e.code === 'already_registered') setError('An account with this email or phone already exists. Go back and sign in instead.');
      else setError(authErrorMessage(e, 'Something went wrong. Please try again.'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      const r = isSignUp
        ? await requestSignUp({ name: p.name ?? '', phone: p.phone ?? '', email: p.email ?? '' })
        : await requestSignIn(p.identifier ?? '');
      setFreshChallenge(r.challengeId);
      setCode('');
      setResent(true);
      timer.current = setTimeout(() => setResent(false), RESEND_COOLDOWN_MS);
    } catch (e) {
      setError(authErrorMessage(e, 'Could not resend the code.'));
    }
  };

  // The code screen only makes sense after a code was requested.
  if (!p.challengeId) return <Redirect href="/(auth)/welcome" />;
  // Without the request details we cannot resend; sending the user back to start over is clearer than a broken button.
  const canResend = isSignUp ? !!(p.name && p.phone && p.email) : !!p.identifier;

  return (
    <Screen>
      <BubuMascot mood="sleepy" size={110} />
      <AppText variant="title">Enter your code</AppText>
      <AppText muted>
        {isSignUp
          ? `We sent a 6-digit code to ${p.email}. It expires in 10 minutes.`
          : 'If an account exists, we sent a code to the email on file. It expires in 10 minutes.'}
      </AppText>
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
      {canResend ? <Button title={resent ? 'New code sent' : 'Send a new code'} variant="ghost" disabled={resent} onPress={resend} /> : null}
      {USE_MOCK_API ? <AppText variant="caption" muted>Demo mode: the code is 123456.</AppText> : null}
    </Screen>
  );
}
