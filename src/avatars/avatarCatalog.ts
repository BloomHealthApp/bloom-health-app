// The 9 profile avatars. The server stores only the id (allowlist bubu-01..bubu-09); the art is drawn locally.
export const AVATAR_IDS = ['bubu-01', 'bubu-02', 'bubu-03', 'bubu-04', 'bubu-05', 'bubu-06', 'bubu-07', 'bubu-08', 'bubu-09'] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export const DEFAULT_AVATAR_ID: AvatarId = 'bubu-01';

export const AVATAR_LABELS: Record<AvatarId, string> = {
  'bubu-01': 'Classic',
  'bubu-02': 'Cloud Hat',
  'bubu-03': 'Candy Stick',
  'bubu-04': 'Heart Specs',
  'bubu-05': 'Star Clip',
  'bubu-06': 'Flower Crown',
  'bubu-07': 'Dreamy',
  'bubu-08': 'Sweet Tooth',
  'bubu-09': 'Balloon',
};

export function isAvatarId(v: unknown): v is AvatarId {
  return typeof v === 'string' && (AVATAR_IDS as readonly string[]).includes(v);
}

export function avatarLabel(id: string | null | undefined): string {
  return isAvatarId(id) ? AVATAR_LABELS[id] : 'Bubu';
}
