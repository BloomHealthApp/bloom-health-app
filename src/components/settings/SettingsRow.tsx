import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText, Row } from '@/components/ui';
import { AppIcon } from '@/icons/AppIcon';
import type { IconName } from '@/icons/iconArt';
import { MIN_TOUCH, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

/** One row in the Settings list. `chevron` is for rows that open another page. */
export function SettingsRow({ icon, title, subtitle, detail, onPress, danger, chevron = true }: { icon: IconName; title: string; subtitle?: string; detail?: string; onPress: () => void; danger?: boolean; chevron?: boolean }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, detail].filter(Boolean).join(', ')}
      accessibilityHint={subtitle}
      style={({ pressed }) => ({ minHeight: MIN_TOUCH + 8, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
    >
      <Row style={{ gap: spacing.md }}>
        <AppIcon name={icon} size={28} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" style={danger ? { color: theme.colors.danger } : undefined}>{title}</AppText>
          {subtitle ? <AppText variant="caption" muted>{subtitle}</AppText> : null}
        </View>
        {detail ? <AppText variant="caption" muted numberOfLines={1} style={{ flexShrink: 1, maxWidth: '45%' }}>{detail}</AppText> : null}
        {chevron ? <AppText variant="heading" muted>›</AppText> : null}
      </Row>
    </Pressable>
  );
}

export function SettingsGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }}>
      {title ? <AppText variant="label" muted accessibilityRole="header" style={{ paddingHorizontal: spacing.xs }}>{title}</AppText> : null}
      {children}
    </View>
  );
}
