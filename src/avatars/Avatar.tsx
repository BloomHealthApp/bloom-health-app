import React from 'react';
import { View } from 'react-native';
import Svg from 'react-native-svg';
import { avatarArt } from './AvatarArt';
import { avatarLabel, isAvatarId } from './avatarCatalog';

export const AVATAR_MIN_SIZE = 32;
export const AVATAR_MAX_SIZE = 120;

interface Props {
  /** avatar id (bubu-01..bubu-09); null/undefined/unknown shows the neutral Bubu face */
  id: string | null | undefined;
  /** diameter in points, clamped to 32-120 */
  size?: number;
  /** the person's name: the label becomes "<name>'s avatar" */
  name?: string | null;
  accessibilityLabel?: string;
  /** hide from screen readers when a neighbouring label already says the same thing */
  decorative?: boolean;
}

/** Round profile picture. The art is a square with a pastel background, cropped to a circle by the container. */
export function Avatar({ id, size = 48, name, accessibilityLabel, decorative }: Props) {
  const d = Math.round(Math.min(AVATAR_MAX_SIZE, Math.max(AVATAR_MIN_SIZE, size)));
  const label = accessibilityLabel ?? (name ? `${name}'s avatar` : isAvatarId(id) ? `${avatarLabel(id)} avatar` : 'Default avatar');
  return (
    <View
      accessible={!decorative}
      accessibilityRole="image"
      accessibilityLabel={decorative ? undefined : label}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      style={{ width: d, height: d, borderRadius: d / 2, overflow: 'hidden' }}
    >
      <Svg width={d} height={d} viewBox="0 0 200 200">
        {avatarArt(id)}
      </Svg>
    </View>
  );
}
