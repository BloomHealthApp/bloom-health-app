import { Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Avatar } from '@/avatars/Avatar';
import { AvatarPicker } from '@/avatars/AvatarPicker';
import { avatarLabel, DEFAULT_AVATAR_ID } from '@/avatars/avatarCatalog';
import { markAvatarPrompted } from '@/avatars/avatarPrompt';
import { AppText, Button, ErrorBanner, Screen } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme/tokens';

/** Shown once right after the first sign-up (see avatars/avatarPrompt.ts). Skippable; never blocks the app. */
export default function ChooseAvatar() {
  const router = useRouter();
  const { status, user, api, updateUser } = useAuth();
  const [picked, setPicked] = useState<string>(DEFAULT_AVATAR_ID);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'loading') return null;
  if (status !== 'signedIn' || !user) return <Redirect href="/(auth)/welcome" />;

  const leave = async () => {
    await markAvatarPrompted(user.id);
    router.replace('/(tabs)');
  };

  const onContinue = async () => {
    setBusy(true);
    setError(null);
    try {
      updateUser(await api.patchMe({ avatar: picked }));
      await leave();
    } catch {
      setError('Could not save your Bloom. Try again, or skip and choose one later in Settings.');
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Avatar id={picked} size={120} accessibilityLabel={`Selected: ${avatarLabel(picked)}`} />
        <AppText variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>Choose your Bloom</AppText>
        <AppText muted style={{ textAlign: 'center' }}>Pick a profile picture. You can change it any time in Settings.</AppText>
      </View>
      <AvatarPicker value={picked} onChange={setPicked} disabled={busy} />
      {error ? <ErrorBanner message={error} /> : null}
      <Button title="Continue" onPress={onContinue} loading={busy} />
      <Button title="Skip for now" variant="ghost" disabled={busy} onPress={() => void leave()} />
    </Screen>
  );
}
