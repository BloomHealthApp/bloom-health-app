import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Field } from '@/components/Field';
import { PhoneField } from '@/components/PhoneField';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText, Button, Card, ErrorBanner, Screen } from '@/components/ui';
import { authErrorMessage, composePhone, splitPhone, validatePhoneParts } from '@/lib/authForm';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme/tokens';

/** Adding or changing a phone needs a code emailed to the account. */
export default function EditPhoneScreen() {
  const router = useRouter();
  const { user, api, updateUser } = useAuth();
  const saved = splitPhone(user?.phone);
  const [countryCode, setCountryCode] = useState(saved.countryCode);
  const [number, setNumber] = useState(saved.number);
  const [touched, setTouched] = useState(false);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const phoneErr = validatePhoneParts(countryCode, number);
  const phone = composePhone(countryCode, number);

  const send = async () => {
    setTouched(true);
    if (phoneErr || busy) return;
    setErr(null);
    setBusy(true);
    try {
      setChallenge((await api.requestPhoneChange(phone)).challengeId);
    } catch (e) {
      setErr(authErrorMessage(e, 'Could not send the code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (!challenge || busy) return;
    setErr(null);
    setBusy(true);
    try {
      updateUser(await api.verifyPhoneChange(challenge, code));
      router.back();
    } catch (e) {
      setCode('');
      setErr(authErrorMessage(e, 'Could not confirm your phone number.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen header={<ScreenHeader title={user?.phone ? 'Change phone' : 'Add phone'} />}>
      {err ? <ErrorBanner message={err} /> : null}
      <Card style={{ gap: spacing.md }}>
        {challenge ? (
          <>
            <AppText muted>We emailed a code to {user?.email}. Your number changes once you confirm it.</AppText>
            <Field label="6-digit code" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} />
            <Button title="Confirm phone number" disabled={code.length !== 6} loading={busy} onPress={confirm} />
            <Button title="Use a different number" variant="ghost" onPress={() => { setChallenge(null); setCode(''); setErr(null); }} />
          </>
        ) : (
          <>
            <PhoneField label="Phone number" countryCode={countryCode} number={number} onChangeCountryCode={setCountryCode} onChangeNumber={setNumber} error={touched ? phoneErr : null} />
            <AppText variant="caption" muted>We&apos;ll email a code to {user?.email} to confirm it&apos;s you. You can then sign in with this number.</AppText>
            <Button title="Send code" loading={busy} disabled={phone === user?.phone} onPress={send} />
          </>
        )}
      </Card>
    </Screen>
  );
}
