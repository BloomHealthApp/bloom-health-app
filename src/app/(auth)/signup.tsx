import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Mascot } from '@/components/Mascot';
import { Field } from '@/components/Field';
import { GenderPicker } from '@/components/GenderPicker';
import { AppText, Button, ErrorBanner, Screen } from '@/components/ui';
import { USE_MOCK_API } from '@/config';
import { authErrorMessage, isAlreadyRegistered, validateEmail, validateName, validatePhone } from '@/lib/authForm';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme/tokens';
import type { Gender } from '@/types/api';

export default function SignUpScreen() {
  const router = useRouter();
  const { requestSignUp } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const nameErr = validateName(name);
  const phoneErr = validatePhone(phone);
  const emailErr = validateEmail(email);
  const valid = !nameErr && !phoneErr && !emailErr;

  const submit = async () => {
    setTouched(true);
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    setConflict(false);
    try {
      const { challengeId } = await requestSignUp({ name, phone, email, gender });
      router.push({
        pathname: '/(auth)/otp',
        params: { challengeId, purpose: 'signup', name: name.trim(), phone: phone.trim(), email: email.trim().toLowerCase(), ...(gender ? { gender } : {}) },
      });
    } catch (e) {
      setConflict(isAlreadyRegistered(e));
      setError(
        isAlreadyRegistered(e)
          ? 'An account with this email or phone already exists.'
          : authErrorMessage(e, 'Could not send the code. Please try again.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Mascot mood="loved" size={88} />
      <AppText variant="title">Create account</AppText>
      <AppText muted>Tell us a little about you. We will email a 6-digit code to confirm your email. No password needed.</AppText>
      <Field label="Your name" value={name} onChangeText={setName} maxLength={40} autoCapitalize="words" autoComplete="name" textContentType="name" placeholder="Anu" error={touched ? nameErr : null} />
      <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="+91 98765 43210" error={touched ? phoneErr : null} />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="you@example.com"
        returnKeyType="send"
        onSubmitEditing={submit}
        error={touched ? emailErr : null}
      />
      <GenderPicker value={gender} onChange={setGender} />
      <AppText variant="caption" muted>Optional. It unlocks features that fit you, and you can change or clear it any time in your profile.</AppText>
      {error ? <ErrorBanner message={error} /> : null}
      {conflict ? (
        <Button title="Sign in instead" variant="secondary" onPress={() => router.replace({ pathname: '/(auth)/signin', params: { identifier: email.trim().toLowerCase() } })} />
      ) : null}
      <Button title="Send code" onPress={submit} loading={busy} />
      <View style={{ gap: spacing.sm }}>
        <Button title="I already have an account" variant="ghost" onPress={() => router.replace('/(auth)/signin')} />
      </View>
      {USE_MOCK_API ? <AppText variant="caption" muted>Demo mode: the code is 123456.</AppText> : null}
    </Screen>
  );
}
