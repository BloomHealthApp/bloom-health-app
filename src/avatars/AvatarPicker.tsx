import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { MIN_TOUCH, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar } from './Avatar';
import { AVATAR_IDS, AVATAR_LABELS, type AvatarId } from './avatarCatalog';

interface Props {
  /** currently selected id (anything that is not a known id means "nothing selected") */
  value: string | null | undefined;
  onChange: (id: AvatarId) => void;
  disabled?: boolean;
  /** avatar diameter; the touch target is always at least 44pt */
  size?: number;
}

/** 3x3 grid of the nine avatars. The selected one gets a ring in the theme accent. */
export function AvatarPicker({ value, onChange, disabled, size = 76 }: Props) {
  const { theme } = useTheme();
  const cell = Math.max(size, MIN_TOUCH);
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Choose your Bubu" style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md }}>
      {AVATAR_IDS.map((id) => {
        const selected = id === value;
        return (
          <View key={id} style={{ width: '33.333%', alignItems: 'center' }}>
            <Pressable
              onPress={() => onChange(id)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !!disabled }}
              accessibilityLabel={`${AVATAR_LABELS[id]} avatar`}
              style={{ alignItems: 'center', gap: spacing.xs, minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, opacity: disabled ? 0.6 : 1 }}
            >
              <View style={{ width: cell + 12, height: cell + 12, borderRadius: (cell + 12) / 2, borderWidth: 3, borderColor: selected ? theme.colors.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <Avatar id={id} size={size} decorative />
              </View>
              <AppText variant="caption" accent={selected} style={{ textAlign: 'center' }}>{AVATAR_LABELS[id]}</AppText>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
