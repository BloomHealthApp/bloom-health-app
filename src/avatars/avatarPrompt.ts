import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import type { User } from '@/types/api';

// The "Choose your Bloom" screen is shown once per account on this device: while the user has no avatar and the flag below is unset.
// Continue and Skip both set the flag, so it never comes back after a skip (the avatar stays changeable in Settings).
export const avatarPromptKey = (userId: string) => `bubu.avatarPrompted.${userId}`;

export async function markAvatarPrompted(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(avatarPromptKey(userId), '1');
  } catch {
    /* best effort: the screen can always be skipped */
  }
}

export type AvatarPromptState = 'checking' | 'show' | 'done';

/** Whether the choose-avatar screen is due. Storage failures resolve to 'done' so a user can never be trapped. */
export function useAvatarPrompt(user: User | null): AvatarPromptState {
  const [read, setRead] = useState<{ id: string; prompted: boolean } | null>(null);
  const id = user?.id;
  const hasAvatar = user?.avatar != null;
  useEffect(() => {
    if (!id || hasAvatar) return;
    let alive = true;
    AsyncStorage.getItem(avatarPromptKey(id))
      .then((v) => alive && setRead({ id, prompted: !!v }))
      .catch(() => alive && setRead({ id, prompted: true }));
    return () => {
      alive = false;
    };
  }, [id, hasAvatar]);
  if (!id) return 'checking';
  if (hasAvatar) return 'done';
  if (read?.id !== id) return 'checking';
  return read.prompted ? 'done' : 'show';
}
