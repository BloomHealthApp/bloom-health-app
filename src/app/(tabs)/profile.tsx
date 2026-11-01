import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Modal, Switch, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { AvatarPicker } from '@/avatars/AvatarPicker';
import { avatarLabel, isAvatarId } from '@/avatars/avatarCatalog';
import { Field } from '@/components/Field';
import { PhoneField } from '@/components/PhoneField';
import { GenderPicker } from '@/components/GenderPicker';
import { ViewerBanner } from '@/components/ViewerBanner';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { AppText, Button, Card, ErrorBanner, IconButton, PageHeader, Row, Screen } from '@/components/ui';
import { useDerived } from '@/features/derived';
import { authErrorMessage, composePhone, splitPhone, validatePhoneParts } from '@/lib/authForm';
import { genderPatch, isPeriodTrackerOn, showTrackerSwitch } from '@/lib/profile';
import { toPublicProfile } from '@/lib/publicProfile';
import { useAuth } from '@/providers/AuthProvider';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { Gender } from '@/types/api';

function MenuIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M4 6.5h16M4 12h16M4 17.5h16" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export default function ProfileTab() {
  const router = useRouter();
  const { user, api, updateUser, isOwner } = useAuth();
  const { theme } = useTheme();
  const d = useDerived();
  const [name, setName] = useState(user?.displayName ?? '');
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const savedPhone = splitPhone(user?.phone);
  const [phoneStep, setPhoneStep] = useState<'idle' | 'number' | 'code'>('idle');
  const [phoneChallenge, setPhoneChallenge] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [countryCode, setCountryCode] = useState(savedPhone.countryCode);
  const [phoneNumber, setPhoneNumber] = useState(savedPhone.number);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneErr = validatePhoneParts(countryCode, phoneNumber);
  const newPhone = composePhone(countryCode, phoneNumber);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  useEffect(() => setName(user?.displayName ?? ''), [user?.displayName]);

  const guarded = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  const startPhone = () => {
    setErr(null);
    setMsg(null);
    setPhoneStep('number');
  };
  const cancelPhone = () => {
    setPhoneStep('idle');
    setPhoneCode('');
    setPhoneTouched(false);
    setErr(null);
  };
  const sendPhoneCode = async () => {
    setPhoneTouched(true);
    if (phoneErr || phoneBusy) return;
    setErr(null);
    setPhoneBusy(true);
    try {
      const { challengeId } = await api.requestPhoneChange(newPhone);
      setPhoneChallenge(challengeId);
      setPhoneStep('code');
    } catch (e) {
      setErr(authErrorMessage(e, 'Could not send the code. Please try again.'));
    } finally {
      setPhoneBusy(false);
    }
  };
  const confirmPhone = async () => {
    if (phoneBusy) return;
    setErr(null);
    setPhoneBusy(true);
    try {
      updateUser(await api.verifyPhoneChange(phoneChallenge, phoneCode));
      setMsg('Phone number updated.');
      cancelPhone();
    } catch (e) {
      setPhoneCode('');
      setErr(authErrorMessage(e, 'Could not confirm your phone number.'));
    } finally {
      setPhoneBusy(false);
    }
  };

  if (!user) return null;
  // A viewer's derived data is the owner's, so it mustn't appear as their own stats.
  const stats = isOwner ? { currentStreak: d.currentStreak, longestStreak: d.longestStreak, habits: d.activeHabits.length } : undefined;
  const openAvatar = () => setPickingAvatar(true);

  return (
    <Screen>
      <PageHeader
        title="Profile"
        right={<IconButton label="Settings" onPress={() => router.push('/settings')}><MenuIcon color={theme.colors.text} /></IconButton>}
      />
      <ViewerBanner />
      {err ? <ErrorBanner message={err} /> : null}
      {msg ? <AppText variant="caption" accent accessibilityLiveRegion="polite">{msg}</AppText> : null}

      <ProfileHeader
        profile={toPublicProfile(user, stats)}
        onAvatarPress={openAvatar}
        avatarHint={`Change avatar. Current: ${isAvatarId(user.avatar) ? avatarLabel(user.avatar) : 'none chosen'}`}
        actions={<Button title={editing ? 'Done' : 'Edit profile'} variant="secondary" onPress={() => setEditing((v) => !v)} />}
      />

      {editing ? (
        <Card style={{ gap: spacing.md }}>
          <Button title="Change avatar" variant="secondary" onPress={openAvatar} />
          <Field label="Display name" value={name} onChangeText={setName} maxLength={40} />
          <Button
            title="Save name"
            variant="secondary"
            disabled={!name.trim() || name.trim() === user.displayName}
            onPress={() => guarded(async () => { updateUser(await api.patchMe({ displayName: name.trim() })); setMsg('Name updated.'); })}
          />
        </Card>
      ) : null}

      <Card style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="heading" accessibilityRole="header">Personal details</AppText>
          <AppText variant="caption" muted>Only you can see this.</AppText>
        </View>
        {user.email ? <AppText>{user.email}</AppText> : null}
        <Row style={{ gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" muted>Phone</AppText>
            <AppText>{user.phone ?? 'Not added'}</AppText>
            {user.phone ? null : <AppText variant="caption" muted>Add your number so you can sign in with it.</AppText>}
          </View>
          {phoneStep === 'idle' ? <Button title={user.phone ? 'Change' : 'Add'} variant="secondary" onPress={startPhone} /> : null}
        </Row>
        {phoneStep === 'number' ? (
          <>
            <PhoneField label="New phone number" countryCode={countryCode} number={phoneNumber} onChangeCountryCode={setCountryCode} onChangeNumber={setPhoneNumber} error={phoneTouched ? phoneErr : null} />
            <AppText variant="caption" muted>We&apos;ll email a code to {user.email} to confirm it&apos;s you.</AppText>
            <Button title="Send code" variant="secondary" loading={phoneBusy} onPress={sendPhoneCode} />
            <Button title="Cancel" variant="ghost" onPress={cancelPhone} />
          </>
        ) : null}
        {phoneStep === 'code' ? (
          <>
            <Field label="6-digit code" value={phoneCode} onChangeText={(t) => setPhoneCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} />
            <AppText variant="caption" muted>We emailed a code to {user.email}. Your number changes once you confirm it.</AppText>
            <Button title="Confirm phone number" variant="secondary" disabled={phoneCode.length !== 6} loading={phoneBusy} onPress={confirmPhone} />
            <Button title="Cancel" variant="ghost" onPress={cancelPhone} />
          </>
        ) : null}
        <GenderPicker value={user.gender} onChange={(g: Gender | null) => guarded(async () => { updateUser(await api.patchMe(genderPatch(g))); setMsg('Profile updated.'); })} />
        {showTrackerSwitch(user) ? (
          <View style={{ gap: spacing.sm }}>
            <Row style={{ gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">Period tracker</AppText>
                <AppText variant="caption" muted>Private to you. Period days also won&apos;t break your streak.</AppText>
              </View>
              <Switch
                value={isPeriodTrackerOn(user)}
                onValueChange={(v) => guarded(async () => { updateUser(await api.patchMe({ periodTrackerEnabled: v })); })}
                accessibilityLabel="Period tracker"
                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                style={{ minHeight: MIN_TOUCH }}
              />
            </Row>
            {isPeriodTrackerOn(user) ? <AppText variant="caption" muted>Find it in the Calendar tab.</AppText> : null}
          </View>
        ) : null}
      </Card>

      <Modal visible={pickingAvatar} animationType="slide" transparent onRequestClose={() => setPickingAvatar(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <View accessibilityViewIsModal style={{ backgroundColor: theme.colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.md }}>
            <AppText variant="heading" accessibilityRole="header">Choose your Bloom</AppText>
            <AvatarPicker
              value={user.avatar}
              disabled={savingAvatar}
              onChange={(id) => {
                if (id === user.avatar) return setPickingAvatar(false);
                setSavingAvatar(true);
                guarded(async () => {
                  updateUser(await api.patchMe({ avatar: id }));
                  setMsg('Avatar updated.');
                  setPickingAvatar(false);
                }).finally(() => setSavingAvatar(false));
              }}
            />
            {err ? <ErrorBanner message={err} /> : null}
            <Button title="Close" variant="secondary" onPress={() => setPickingAvatar(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
