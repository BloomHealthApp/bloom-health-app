import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Mascot } from '@/components/Mascot';
import { Field } from '@/components/Field';
import { AppText, Button, ErrorBanner, Screen } from '@/components/ui';
import { USE_MOCK_API } from '@/config';
import { authErrorMessage, validateIdentifier } from '@/lib/authForm';
import { useAuth } from '@/providers/AuthProvider';

export default function SignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ identifier?: string }>();
  const { requestSignIn } = useAuth();
  const [identifier, setIdentifier] = useState(typeof params.identifier === 'string' ? params.identifier : '');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idErr = validateIdentifier(identifier);

  const submit = async () => {
    setTouched(true);
    if (idErr || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { challengeId } = await requestSignIn(identifier);
      router.push({ pathname: '/(auth)/otp', params: { challengeId, purpose: 'signin', identifier: identifier.trim() } });
    } catch (e) {
      setError(authErrorMessage(e, 'Could not send the code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Mascot mood="happy" size={110} />
      <AppText variant="title">Sign in</AppText>
      <AppText muted>Enter your phone number or email. We will send a 6-digit code to the email on your account.</AppText>
      <Field
        label="Phone or email"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        keyboardType="email-address"
        placeholder="+91 98765 43210 or you@example.com"
        returnKeyType="send"
        onSubmitEditing={submit}
        error={touched ? idErr : null}
      />
      {error ? <ErrorBanner message={error} /> : null}
      <Button title="Send code" onPress={submit} loading={busy} />
      <Button title="Create an account" variant="ghost" onPress={() => router.replace('/(auth)/signup')} />
      {USE_MOCK_API ? <AppText variant="caption" muted>Demo mode: use anu@example.com (owner, +919876543210) or aman@example.com (viewer, +919876543211). The code is 123456.</AppText> : null}
    </Screen>
  );
}
