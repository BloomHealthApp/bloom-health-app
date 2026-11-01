import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Field, Segmented } from '@/components/Field';
import { Mascot } from '@/components/Mascot';
import { PhoneField } from '@/components/PhoneField';
import { AppText, Button, ErrorBanner, Screen } from '@/components/ui';
import { USE_MOCK_API } from '@/config';
import { authErrorMessage, composePhone, splitPhone, validateEmail, validatePhoneParts } from '@/lib/authForm';
import { useAuth } from '@/providers/AuthProvider';

type Mode = 'phone' | 'email';

export default function SignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ identifier?: string; mode?: string }>();
  const { requestSignIn } = useAuth();
  const given = typeof params.identifier === 'string' ? params.identifier : '';
  const givenIsEmail = given.includes('@');
  const givenPhone = splitPhone(givenIsEmail ? '' : given);
  const [mode, setMode] = useState<Mode>(params.mode === 'email' || givenIsEmail ? 'email' : 'phone');
  const [countryCode, setCountryCode] = useState(givenPhone.countryCode);
  const [number, setNumber] = useState(givenPhone.number);
  const [email, setEmail] = useState(givenIsEmail ? given : '');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputErr = mode === 'phone' ? validatePhoneParts(countryCode, number) : validateEmail(email);

  const changeMode = (next: Mode) => {
    setMode(next);
    setTouched(false);
    setError(null);
  };

  const submit = async () => {
    setTouched(true);
    if (inputErr || busy) return;
    setBusy(true);
    setError(null);
    try {
      const identifier = mode === 'phone' ? composePhone(countryCode, number) : email.trim();
      const { challengeId } = await requestSignIn(identifier);
      router.push({ pathname: '/(auth)/otp', params: { challengeId, purpose: 'signin', identifier } });
    } catch (e) {
      setError(authErrorMessage(e, 'Could not send the code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Mascot mood="happy" size={88} />
      <AppText variant="title">Sign in</AppText>
      <AppText muted>We will send a 6-digit code to the email on your account.</AppText>
      <Segmented
        label="Sign in with"
        options={[{ value: 'phone', label: 'Phone' }, { value: 'email', label: 'Email' }]}
        value={mode}
        onChange={changeMode}
      />
      {mode === 'phone' ? (
        <PhoneField
          countryCode={countryCode}
          number={number}
          onChangeCountryCode={setCountryCode}
          onChangeNumber={setNumber}
          returnKeyType="send"
          onSubmitEditing={submit}
          error={touched ? inputErr : null}
        />
      ) : (
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          returnKeyType="send"
          onSubmitEditing={submit}
          error={touched ? inputErr : null}
        />
      )}
      {error ? <ErrorBanner message={error} /> : null}
      <Button title="Send code" onPress={submit} loading={busy} />
      <Button title="Create an account" variant="ghost" onPress={() => router.replace('/(auth)/signup')} />
      {USE_MOCK_API ? <AppText variant="caption" muted>Demo mode: use anu@example.com (owner, 9876543210) or aman@example.com (viewer, 9876543211). The code is 123456.</AppText> : null}
    </Screen>
  );
}
