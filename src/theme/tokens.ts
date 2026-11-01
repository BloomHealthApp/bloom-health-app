/** Shared rhythm and shape scale for every app surface. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 40 } as const;
export const radius = { sm: 12, md: 18, lg: 26, xl: 32, pill: 999 } as const;
export const MIN_TOUCH = 44;
export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold',
} as const;
export const typography = {
  title: { fontFamily: fonts.heavy, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23 },
  caption: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, letterSpacing: 0.1 },
  big: { fontFamily: fonts.heavy, fontSize: 40, lineHeight: 46, letterSpacing: -1 },
} as const;
export type TypographyVariant = keyof typeof typography;
