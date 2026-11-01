import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { Avatar } from '@/avatars/Avatar';
import { GenderPicker } from '@/components/GenderPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText, Card, ErrorBanner, Row, Screen } from '@/components/ui';
import { useGuarded } from '@/features/useGuarded';
import { LineIcon } from '@/icons/LineIcon';
import { genderPatch, isPeriodTrackerOn, showTrackerSwitch } from '@/lib/profile';
import { useAuth } from '@/providers/AuthProvider';
import { fonts, MIN_TOUCH, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { Gender } from '@/types/api';

const LABEL_WIDTH = 92;

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, api, updateUser } = useAuth();
  const { theme } = useTheme();
  const c = theme.colors;
  const { err, guarded } = useGuarded();
  const [name, setName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  if (!user) return null;

  const hairline = { borderBottomWidth: 1, borderBottomColor: c.border };
  const done = async () => {
    const next = name.trim();
    if (saving || !next) return;
    if (next === user.displayName) return router.back();
    setSaving(true);
    try {
      await guarded(async () => {
        updateUser(await api.patchMe({ displayName: next }));
        router.back();
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      header={
        <ScreenHeader
          title="Edit profile"
          right={
            <Pressable onPress={done} disabled={saving || !name.trim()} accessibilityRole="button" accessibilityLabel="Done" style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', opacity: saving || !name.trim() ? 0.5 : 1 }}>
              <AppText variant="label" accent>Done</AppText>
            </Pressable>
          }
        />
      }
    >
      {err ? <ErrorBanner message={err} /> : null}
      <Pressable onPress={() => router.push('/edit-profile/avatar')} accessibilityRole="button" accessibilityLabel="Edit avatar" style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm }}>
        <Avatar id={user.avatar} size={84} decorative />
        <AppText variant="label" accent>Edit avatar</AppText>
      </Pressable>

      <Card style={{ paddingVertical: spacing.xs }}>
        <Row style={{ ...hairline, minHeight: MIN_TOUCH }}>
          <AppText style={{ width: LABEL_WIDTH }}>Name</AppText>
          <TextInput
            accessibilityLabel="Display name"
            value={name}
            onChangeText={setName}
            maxLength={40}
            autoCapitalize="words"
            placeholderTextColor={c.textMuted}
            style={{ flex: 1, minHeight: MIN_TOUCH, fontFamily: fonts.regular, fontSize: 13, color: c.text }}
          />
        </Row>
        <Row style={{ ...hairline, minHeight: MIN_TOUCH }}>
          <AppText style={{ width: LABEL_WIDTH }}>Email</AppText>
          <AppText muted numberOfLines={1} style={{ flex: 1 }}>{user.email}</AppText>
        </Row>
        <Pressable onPress={() => router.push('/edit-profile/phone')} accessibilityRole="button" accessibilityLabel={user.phone ? 'Change phone' : 'Add phone'} style={({ pressed }) => ({ ...hairline, minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.6 : 1 })}>
          <AppText style={{ width: LABEL_WIDTH }}>Phone</AppText>
          <AppText muted={!user.phone} numberOfLines={1} style={{ flex: 1 }}>{user.phone ?? 'Not added'}</AppText>
          <LineIcon name="chevron" color={c.textMuted} size={14} />
        </Pressable>
        <View style={{ ...(showTrackerSwitch(user) ? hairline : null), paddingVertical: spacing.md, gap: spacing.sm }}>
          <AppText>Gender</AppText>
          <GenderPicker hideLabel label="Gender" value={user.gender} onChange={(g: Gender | null) => guarded(async () => updateUser(await api.patchMe(genderPatch(g))))} />
        </View>
        {showTrackerSwitch(user) ? (
          <Row style={{ minHeight: MIN_TOUCH, gap: spacing.md, paddingVertical: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <AppText>Period tracker</AppText>
              <AppText variant="caption" muted>Private to you. Period days also won&apos;t break your streak.</AppText>
            </View>
            <Switch
              value={isPeriodTrackerOn(user)}
              onValueChange={(v) => guarded(async () => updateUser(await api.patchMe({ periodTrackerEnabled: v })))}
              accessibilityLabel="Period tracker"
              trackColor={{ true: c.primary, false: c.border }}
              style={{ minHeight: MIN_TOUCH }}
            />
          </Row>
        ) : null}
      </Card>
      <AppText variant="caption" muted>Your email, phone and gender are only visible to you.</AppText>
    </Screen>
  );
}
