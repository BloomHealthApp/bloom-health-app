import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type StyleProp, type TextProps, type ViewProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MIN_TOUCH, radius, spacing, typography, type TypographyVariant } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export function AppText({ variant = 'body', muted, accent, style, ...rest }: TextProps & { variant?: TypographyVariant; muted?: boolean; accent?: boolean }) {
  const { theme } = useTheme();
  const color = muted ? theme.colors.textMuted : accent ? theme.colors.accent : theme.colors.text;
  return <Text {...rest} style={[typography[variant], { color }, style]} />;
}

export function Card({ children, style, tint, ...rest }: ViewProps & { children: React.ReactNode; style?: StyleProp<ViewStyle>; tint?: boolean }) {
  const { theme } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: tint ? theme.colors.tint : theme.colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          borderWidth: tint ? 0 : 1,
          borderColor: theme.colors.border,
          ...(theme.isDark ? null : { shadowColor: '#26352C', shadowOpacity: tint ? 0 : 0.035, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: tint ? 0 : 1 }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style, accessibilityLabel, accessibilityHint }: ButtonProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const bg = variant === 'primary' ? c.primary : variant === 'danger' ? c.danger : variant === 'secondary' ? c.tint : 'transparent';
  const fg = variant === 'primary' ? c.onPrimary : variant === 'danger' ? c.onDanger : c.accent;
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        { minHeight: MIN_TOUCH + 4, minWidth: MIN_TOUCH, borderRadius: radius.pill, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, opacity: off ? 0.5 : pressed ? 0.88 : 1, transform: [{ scale: pressed && !off ? 0.985 : 1 }] },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <AppText variant="label" style={{ color: fg, fontSize: 16 }}>{title}</AppText>}
    </Pressable>
  );
}

/** Round/pill icon-ish button with guaranteed 44pt target. */
export function IconButton({ label, onPress, children, disabled, style }: { label: string; onPress: () => void; children: React.ReactNode; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={4}
      style={({ pressed }) => [{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.tint, paddingHorizontal: spacing.md, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

/** Extra bottom space a screen leaves for a bar floating over it. */
export const TabBarSpaceContext = React.createContext(0);

export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing,
  padded = true,
  header,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  padded?: boolean;
  header?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarSpace = React.useContext(TabBarSpaceContext);
  const body = { padding: padded ? spacing.lg : 0, paddingBottom: spacing.xxxl + tabBarSpace, gap: spacing.lg };
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={body}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, body]}>{children}</View>
      )}
    </View>
  );
}

export function Row({ children, style, ...rest }: ViewProps & { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View {...rest} style={[styles.row, style]}>{children}</View>;
}

/** Standard page title for primary navigation screens. */
export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <AppText variant="title" accessibilityRole="header">{title}</AppText>
        {subtitle ? <AppText variant="caption" muted>{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  );
}

/** Standard section title keeps hierarchy and spacing consistent across routes. */
export function SectionTitle({ children, detail, style }: { children: React.ReactNode; detail?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.xs }, style]}>
      <AppText variant="heading" accessibilityRole="header">{children}</AppText>
      {detail ? <AppText variant="caption" muted>{detail}</AppText> : null}
    </View>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ padding: spacing.xl, alignItems: 'center' }} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={theme.colors.primary} size="large" />
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { theme } = useTheme();
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: theme.colors.dangerTint, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: theme.colors.danger }}>
      <AppText variant="bodyStrong" style={{ color: theme.colors.danger }}>{message}</AppText>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });
