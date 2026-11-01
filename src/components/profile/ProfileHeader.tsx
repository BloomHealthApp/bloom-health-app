import React from 'react';
import { Pressable, View } from 'react-native';
import { Avatar } from '@/avatars/Avatar';
import { AppText, Card, Row } from '@/components/ui';
import type { PublicProfile } from '@/lib/publicProfile';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const AVATAR = 84;
const BADGE = 26;

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View accessible accessibilityLabel={`${value} ${label}`} style={{ flex: 1 }}>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" muted numberOfLines={1}>{label}</AppText>
    </View>
  );
}

/**
 * Shows a profile from public data only, so it works for your own profile and for other people's.
 * `children` holds what's specific to the viewer: private details and Edit for your own, or something like Follow for others.
 */
export function ProfileHeader({ profile, onAvatarPress, avatarHint, children }: { profile: PublicProfile; onAvatarPress?: () => void; avatarHint?: string; children?: React.ReactNode }) {
  const { theme } = useTheme();
  const avatar = <Avatar id={profile.avatar} size={AVATAR} decorative />;
  return (
    <Card style={{ gap: spacing.lg }}>
      <Row style={{ gap: spacing.xl }}>
        {onAvatarPress ? (
          <Pressable onPress={onAvatarPress} accessibilityRole="button" accessibilityLabel={avatarHint ?? 'Avatar'}>
            {avatar}
            <View style={{ position: 'absolute', right: -2, bottom: -2, width: BADGE, height: BADGE, borderRadius: BADGE / 2, borderWidth: 2, borderColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.text }}>
              <AppText variant="label" style={{ color: theme.colors.bg, lineHeight: 18, fontSize: 16 }}>+</AppText>
            </View>
          </Pressable>
        ) : avatar}
        <View style={{ flex: 1, gap: spacing.sm }}>
          <AppText variant="bodyStrong" numberOfLines={1}>{profile.displayName}</AppText>
          {profile.stats ? (
            <Row>
              <Stat value={profile.stats.currentStreak} label="day streak" />
              <Stat value={profile.stats.longestStreak} label="best streak" />
              <Stat value={profile.stats.habits} label={profile.stats.habits === 1 ? 'habit' : 'habits'} />
            </Row>
          ) : null}
        </View>
      </Row>
      {children}
    </Card>
  );
}
