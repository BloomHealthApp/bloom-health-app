import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { avatarLabel, isAvatarId } from '@/avatars/avatarCatalog';
import { ViewerBanner } from '@/components/ViewerBanner';
import { ActivityGraph } from '@/components/profile/ActivityGraph';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileCards } from '@/components/profile/ProfileCards';
import { AppText, Button, IconButton, PageHeader, Screen } from '@/components/ui';
import { useDerived } from '@/features/derived';
import { LineIcon, type LineIconName } from '@/icons/LineIcon';
import { isPeriodTrackerOn } from '@/lib/profile';
import { toPublicProfile } from '@/lib/publicProfile';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { GENDER_OPTIONS } from '@/types/api';

const ROW = 30;

function MenuIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M4 6.5h16M4 12h16M4 17.5h16" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function DetailRow({ icon, value, copyLabel, onCopy }: { icon: LineIconName; value: string; copyLabel?: string; onCopy?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ minHeight: ROW, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <LineIcon name={icon} color={theme.colors.textMuted} size={15} />
      <AppText numberOfLines={1} style={{ flex: 1 }}>{value}</AppText>
      {onCopy ? (
        <Pressable onPress={onCopy} accessibilityRole="button" accessibilityLabel={copyLabel} hitSlop={8} style={({ pressed }) => ({ minWidth: ROW, minHeight: ROW, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
          <LineIcon name="copy" color={theme.colors.textMuted} size={14} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function ProfileTab() {
  const router = useRouter();
  const { user, isOwner } = useAuth();
  const { theme } = useTheme();
  const d = useDerived();
  const [msg, setMsg] = useState<string | null>(null);

  const copy = async (value: string, done: string) => {
    await Clipboard.setStringAsync(value);
    setMsg(done);
  };

  if (!user) return null;
  const genderLabel = GENDER_OPTIONS.find((o) => o.value === user.gender)?.label;
  // A viewer's derived data is the owner's, so it mustn't appear as their own stats.
  const stats = isOwner ? { currentStreak: d.currentStreak, longestStreak: d.longestStreak, habits: d.activeHabits.length } : undefined;

  return (
    <Screen>
      <PageHeader
        title="Profile"
        right={
            <IconButton label="Settings" onPress={() => router.push('/settings')}>
            <MenuIcon color={theme.colors.text} />
          </IconButton>
        }
      />
      <ViewerBanner />
      {msg ? <AppText variant="caption" accent accessibilityLiveRegion="polite">{msg}</AppText> : null}

      <ProfileHeader
        profile={toPublicProfile(user, stats)}
        onAvatarPress={() => router.push('/edit-profile/avatar')}
        avatarHint={`Change avatar. Current: ${isAvatarId(user.avatar) ? avatarLabel(user.avatar) : 'none chosen'}`}
      >
        <View>
          {user.email ? <DetailRow icon="mail" value={user.email} copyLabel="Copy email" onCopy={() => copy(user.email, 'Email copied.')} /> : null}
          {user.phone ? <DetailRow icon="phone" value={user.phone} copyLabel="Copy phone number" onCopy={() => copy(user.phone as string, 'Phone number copied.')} /> : <DetailRow icon="phone" value="Not added" />}
          {genderLabel ? <DetailRow icon="gender" value={genderLabel} /> : null}
          {isPeriodTrackerOn(user) ? (
            <Pressable
              onPress={() => router.navigate('/(tabs)/calendar')}
              accessibilityRole="button"
              accessibilityLabel="Find it in the Calendar tab."
              style={({ pressed }) => ({ minHeight: ROW, flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: pressed ? 0.6 : 1 })}
            >
              <LineIcon name="calendar" color={theme.colors.textMuted} size={15} />
              <AppText style={{ flex: 1 }}>Period tracker: find it in the Calendar tab.</AppText>
              <LineIcon name="chevron" color={theme.colors.textMuted} size={13} />
            </Pressable>
          ) : null}
        </View>
        {user.phone ? null : <AppText variant="caption" muted>Add your number so you can sign in with it.</AppText>}
        <Button title="Edit profile" variant="secondary" onPress={() => router.push('/edit-profile')} />
      </ProfileHeader>

      {isOwner ? <ActivityGraph /> : null}
      {isOwner ? <ProfileCards /> : null}
    </Screen>
  );
}
