import React from 'react';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ThemePicker } from '@/components/ThemePicker';
import { Card, Screen } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import type { ThemeName } from '@/types/api';

export default function AppearanceScreen() {
  const { api, updateUser } = useAuth();
  return (
    <Screen header={<ScreenHeader title="Appearance" />}>
      <Card>
        <ThemePicker onPick={(n: ThemeName) => void api.patchMe({ theme: n }).then(updateUser).catch(() => {})} />
      </Card>
    </Screen>
  );
}
