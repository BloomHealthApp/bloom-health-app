/** Shared rhythm and shape scale for every app surface. */
export const spacing = { xs: 4, sm: 6, md: 10, lg: 14, xl: 20, xxl: 26, xxxl: 32 } as const;
export const radius = { sm: 10, md: 15, lg: 22, xl: 28, pill: 999 } as const;
export const MIN_TOUCH = 44;
export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold',
} as const;
export const typography = {
  title: { fontFamily: fonts.heavy, fontSize: 25, lineHeight: 30, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17 },
  label: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, letterSpacing: 0.1 },
  big: { fontFamily: fonts.heavy, fontSize: 34, lineHeight: 40, letterSpacing: -1 },
} as const;
export type TypographyVariant = keyof typeof typography;
