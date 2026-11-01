/** Shared rhythm and shape scale for every app surface. */
export const spacing = { xs: 4, sm: 6, md: 9, lg: 12, xl: 18, xxl: 24, xxxl: 28 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 } as const;
export const MIN_TOUCH = 44;
export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold',
} as const;
export const typography = {
  title: { fontFamily: fonts.heavy, fontSize: 23, lineHeight: 28, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  big: { fontFamily: fonts.heavy, fontSize: 30, lineHeight: 36, letterSpacing: -1 },
} as const;
export type TypographyVariant = keyof typeof typography;
