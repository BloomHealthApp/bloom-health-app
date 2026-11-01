import React from 'react';
import { Pressable, View } from 'react-native';
import { Avatar } from '@/avatars/Avatar';
import { AppText, Card, Row } from '@/components/ui';
import type { PublicProfile } from '@/lib/publicProfile';
import { MIN_TOUCH, spacing } from '@/theme/tokens';

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View accessible accessibilityLabel={`${value} ${label}`} style={{ flex: 1, alignItems: 'center' }}>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" muted>{label}</AppText>
    </View>
  );
}

/** Shows a profile from public data only, so it works for your own profile and for other people's. `actions` holds what the viewer can do. */
export function ProfileHeader({ profile, onAvatarPress, avatarHint, actions }: { profile: PublicProfile; onAvatarPress?: () => void; avatarHint?: string; actions?: React.ReactNode }) {
  const avatar = <Avatar id={profile.avatar} size={72} decorative />;
  return (
    <Card style={{ gap: spacing.md }}>
      <Row style={{ gap: spacing.lg }}>
        {onAvatarPress ? (
          <Pressable onPress={onAvatarPress} accessibilityRole="button" accessibilityLabel={avatarHint ?? 'Avatar'} style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH }}>
            {avatar}
          </Pressable>
        ) : avatar}
        <AppText variant="title" numberOfLines={2} style={{ flex: 1 }}>{profile.displayName}</AppText>
      </Row>
      {profile.stats ? (
        <Row>
          <Stat value={profile.stats.currentStreak} label="day streak" />
          <Stat value={profile.stats.longestStreak} label="best streak" />
          <Stat value={profile.stats.habits} label={profile.stats.habits === 1 ? 'habit' : 'habits'} />
        </Row>
      ) : null}
      {actions}
    </Card>
  );
}
