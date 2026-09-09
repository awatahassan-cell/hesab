import { Platform, TextStyle } from 'react-native';

export const FONT_FAMILY = Platform.select({
  android: 'IBMPlexSansArabic-Regular',
  ios: 'IBMPlexSansArabic-Regular',
  default: '"IBM Plex Sans Arabic", "Inter", system-ui, sans-serif'
}) as string;

export const FONT_FAMILY_MEDIUM = Platform.select({
  android: 'IBMPlexSansArabic-Medium',
  ios: 'IBMPlexSansArabic-Medium',
  default: '"IBM Plex Sans Arabic", "Inter", system-ui, sans-serif'
}) as string;

export const FONT_FAMILY_SEMIBOLD = Platform.select({
  android: 'IBMPlexSansArabic-SemiBold',
  ios: 'IBMPlexSansArabic-SemiBold',
  default: '"IBM Plex Sans Arabic", "Inter", system-ui, sans-serif'
}) as string;

export const FONT_FAMILY_BOLD = Platform.select({
  android: 'IBMPlexSansArabic-Bold',
  ios: 'IBMPlexSansArabic-Bold',
  default: '"IBM Plex Sans Arabic", "Inter", system-ui, sans-serif'
}) as string;

export const typography = {
  // Hero balance display
  hero: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums']
  } as TextStyle,

  // Section titles
  titleLarge: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.2
  } as TextStyle,

  titleMedium: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 18,
    fontWeight: '600' as const
  } as TextStyle,

  titleSmall: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 16,
    fontWeight: '600' as const
  } as TextStyle,

  // Numbers in lists and transaction amounts
  tabularNumber: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 16,
    fontWeight: '600' as const,
    fontVariant: ['tabular-nums']
  } as TextStyle,

  tabularLarge: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 24,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums']
  } as TextStyle,

  // Body text
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22
  } as TextStyle,

  bodySemibold: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22
  } as TextStyle,

  bodySmall: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18
  } as TextStyle,

  // Metadata, dates, tags
  caption: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 12,
    fontWeight: '500' as const
  } as TextStyle,

  captionSmall: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.3
  } as TextStyle
};
