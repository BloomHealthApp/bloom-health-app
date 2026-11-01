import React, { useState } from 'react';
import { Modal, Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { COUNTRY_CODES } from '@/lib/authForm';
import { fonts, MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

interface Props extends Pick<TextInputProps, 'onSubmitEditing' | 'returnKeyType' | 'editable'> {
  label?: string;
  countryCode: string;
  number: string;
  onChangeCountryCode: (code: string) => void;
  onChangeNumber: (number: string) => void;
  error?: string | null;
}

/** A phone number entered as a separate country code and number. Combine them with `composePhone`. */
export function PhoneField({ label = 'Phone', countryCode, number, onChangeCountryCode, onChangeNumber, error, ...input }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [picking, setPicking] = useState(false);
  const box = { minHeight: MIN_TOUCH, borderRadius: radius.md, borderWidth: 1, borderColor: error ? c.danger : c.border, backgroundColor: theme.glass };
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label" muted>{label}</AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Pressable
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel={`Country code ${countryCode}. Tap to change.`}
          style={{ ...box, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
        >
          <AppText variant="bodyStrong">{countryCode}</AppText>
          <AppText variant="caption" muted>▾</AppText>
        </Pressable>
        <TextInput
          accessibilityLabel={label}
          value={number}
          onChangeText={onChangeNumber}
          keyboardType="number-pad"
          autoComplete="tel-national"
          textContentType="telephoneNumber"
          placeholder="98765 43210"
          placeholderTextColor={c.textMuted}
          {...input}
          style={{ ...box, flex: 1, paddingHorizontal: spacing.lg, fontFamily: fonts.semibold, fontSize: 14, color: c.text }}
        />
      </View>
      {error ? <AppText variant="caption" style={{ color: c.danger }} accessibilityRole="alert">{error}</AppText> : null}
      <Modal visible={picking} animationType="slide" transparent onRequestClose={() => setPicking(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <View accessibilityViewIsModal style={{ backgroundColor: c.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.xs }}>
            <AppText variant="heading" accessibilityRole="header">Country code</AppText>
            {COUNTRY_CODES.map((o) => (
              <Pressable
                key={o.code}
                onPress={() => {
                  onChangeCountryCode(o.code);
                  setPicking(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: o.code === countryCode }}
                accessibilityLabel={`${o.name} ${o.code}`}
                style={{ minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <AppText variant={o.code === countryCode ? 'bodyStrong' : 'body'}>{o.name}</AppText>
                <AppText variant="bodyStrong" accent={o.code === countryCode}>{o.code}</AppText>
              </Pressable>
            ))}
            <Button title="Close" variant="secondary" onPress={() => setPicking(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
