import { AppIcon } from '@/icons/AppIcon';
import React from 'react';
import { View } from 'react-native';
import { Avatar } from '@/avatars/Avatar';
import { useAuth } from '@/providers/AuthProvider';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './ui';

export function ViewerBanner() {
  const { user } = useAuth();
  const { theme } = useTheme();
  if (user?.role !== 'viewer') return null;
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={`Viewing ${user.ownerDisplayName}'s progress. Read only.`} style={{ backgroundColor: theme.colors.secondary, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
      {user.ownerAvatar ? <Avatar id={user.ownerAvatar} size={36} decorative /> : <AppIcon name="eyes" size={32} />}
      <AppText variant="bodyStrong" style={{ flex: 1 }}>Viewing {user.ownerDisplayName}&apos;s progress</AppText>
      <AppText variant="caption" muted>Read only</AppText>
    </View>
  );
}
