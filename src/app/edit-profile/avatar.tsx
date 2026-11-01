import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { AvatarPicker } from '@/avatars/AvatarPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card, ErrorBanner, Screen } from '@/components/ui';
import { useGuarded } from '@/features/useGuarded';
import { useAuth } from '@/providers/AuthProvider';

export default function EditAvatarScreen() {
  const router = useRouter();
  const { user, api, updateUser } = useAuth();
  const { err, guarded } = useGuarded();
  const [saving, setSaving] = useState(false);
  return (
    <Screen header={<ScreenHeader title="Choose your Bloom" />}>
      {err ? <ErrorBanner message={err} /> : null}
      <Card>
      <AvatarPicker
        value={user?.avatar}
        disabled={saving}
        onChange={(id) => {
          if (id === user?.avatar) return router.back();
          setSaving(true);
          void guarded(async () => {
            updateUser(await api.patchMe({ avatar: id }));
            router.back();
          }).finally(() => setSaving(false));
        }}
      />
      </Card>
    </Screen>
  );
}
