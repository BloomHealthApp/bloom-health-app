import type { User } from '@/types/api';

/**
 * The only user data a profile view may show, on your own profile or someone else's. Never add email, phone, gender,
 * tracker or period data: public search will reuse this shape.
 */
export interface PublicProfile {
  id: string;
  displayName: string;
  avatar: string | null;
  /** absent when there's nothing to show, such as for a viewer whose stats would be the owner's */
  stats?: { currentStreak: number; longestStreak: number; habits: number };
}

export function toPublicProfile(user: Pick<User, 'id' | 'displayName' | 'avatar'>, stats?: PublicProfile['stats']): PublicProfile {
  return { id: user.id, displayName: user.displayName, avatar: user.avatar ?? null, ...(stats ? { stats } : {}) };
}
