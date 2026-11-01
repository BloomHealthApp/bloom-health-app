import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Modal, Switch, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { AvatarPicker } from '@/avatars/AvatarPicker';
import { avatarLabel, isAvatarId } from '@/avatars/avatarCatalog';
import { Field } from '@/components/Field';
import { GenderPicker } from '@/components/GenderPicker';
import { ViewerBanner } from '@/components/ViewerBanner';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { AppText, Button, Card, ErrorBanner, IconButton, PageHeader, Row, Screen } from '@/components/ui';
import { useDerived } from '@/features/derived';
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
        {user.phone ? <AppText>{user.phone}</AppText> : null}
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
