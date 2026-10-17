import React from 'react';
import { Modal, View } from 'react-native';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText, Button, Row } from './ui';

export function ConfirmationDialog({ visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive, onConfirm, onCancel }: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} accessibilityViewIsModal>
      <View style={{ flex: 1, backgroundColor: 'rgba(40,20,35,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <View accessibilityRole="alert" style={{ width: '100%', maxWidth: 420, backgroundColor: theme.colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md }}>
          <AppText variant="heading">{title}</AppText>
          <AppText muted>{message}</AppText>
          <Row style={{ gap: spacing.sm, justifyContent: 'flex-end', marginTop: spacing.sm }}>
            <Button title={cancelLabel} variant="ghost" onPress={onCancel} />
            <Button title={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} />
          </Row>
        </View>
      </View>
    </Modal>
  );
}
