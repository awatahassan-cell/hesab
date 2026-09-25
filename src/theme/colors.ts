export interface ColorTheme {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceSubtle: string;
  cardBorder: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  accent: string;
  accentMuted: string;
  heroGradient: [string, string, string];
  /** The header's own richer gradient — three to four warm stops, used only
   *  behind the home header where there's room for it to read as a gradient
   *  rather than a flat wash. */
  heroGradientRich: [string, string, string, string];
  /** Text/icon colour to place on top of heroGradient / heroGradientRich —
   *  not simply textInverse, because the gradient is a warm mid-tone in both
   *  themes rather than a true light/dark extreme. */
  heroOnGradient: string;
  cardGlow: string;

  // Glass layer — frosted surfaces sitting over the aurora wash.
  // In light these lighten toward white; in dark they lift off the ground.
  glass: string;
  glassStrong: string;
  glassEdge: string;
  hairline: string;
  // Three blurred colour fields painted behind the content of a screen.
  aurora: [string, string, string];
  auroraOpacity: [number, number, number];
  // Passed straight to expo-blur's `tint`.
  blurTint: 'light' | 'dark';
  shadowColor: string;

  // Semantic
  expense: string;
  expenseMuted: string;
  income: string;
  incomeMuted: string;
  transfer: string;
  transferMuted: string;
  debtLent: string;
  debtLentMuted: string;
  debtBorrowed: string;
  debtBorrowedMuted: string;

  warning: string;
  warningMuted: string;
  danger: string;
  success: string;
}

// "شەفەق" (Şefeq / Dawn) — a warm gradient family running from deep plum to
// dawn gold, present in both themes rather than confined to a "dark mode
// only" hero. Day reads as the same sky at midday (pale cream to rich
// terracotta); night reads as dusk (deep plum to warm gold). One accent hue
// — terracotta — carries through both, so the app reads as one thing.

export const lightColors: ColorTheme = {
  isDark: false,
  background: '#FBF5EE',
  surface: '#FFFFFF',
  surfaceSecondary: '#F5E9DC',
  surfaceSubtle: '#EFDDC9',
  cardBorder: '#EDDBC4',
  divider: '#F2E6D6',
  textPrimary: '#2A1D1A',
  textSecondary: '#6E5B4E',
  textMuted: '#A6907C',
  textInverse: '#FFFFFF',
  accent: '#C6603F',
  accentMuted: '#F6E4D8',
  heroGradient: ['#F0B48B', '#E8916A', '#C6603F'],
  heroGradientRich: ['#FDF0E4', '#F6CBA8', '#EFA860', '#D9723F'],
  heroOnGradient: '#3A2318',
  cardGlow: 'rgba(198, 96, 63, 0.22)',

  glass: 'rgba(255, 255, 255, 0.72)',
  glassStrong: 'rgba(255, 255, 255, 0.88)',
  glassEdge: 'rgba(255, 255, 255, 0.95)',
  hairline: 'rgba(42, 29, 26, 0.07)',
  aurora: ['#F0B48B', '#F6CBAE', '#EEDFC8'],
  auroraOpacity: [0.5, 0.4, 0.3],
  blurTint: 'light',
  shadowColor: '#2A1D1A',

  expense: '#B8362B',
  expenseMuted: '#F8E2DE',
  income: '#0E8F6B',
  incomeMuted: '#DFF3EA',
  transfer: '#5C6B8A',
  transferMuted: '#E8ECF3',
  debtLent: '#3D7A5C',
  debtLentMuted: '#E1F0E7',
  debtBorrowed: '#9A3B12',
  debtBorrowedMuted: '#F7E4DA',

  warning: '#B87333',
  warningMuted: '#F5E7D3',
  danger: '#B8362B',
  success: '#0E8F6B'
};

export const darkColors: ColorTheme = {
  isDark: true,
  background: '#1C1220',
  surface: '#241A2B',
  surfaceSecondary: '#2E2233',
  surfaceSubtle: '#3A2C40',
  cardBorder: '#3A2C40',
  divider: '#2E2233',
  textPrimary: '#F7EEE4',
  textSecondary: '#B7A3A8',
  textMuted: '#7C6870',
  textInverse: '#FFFFFF',
  accent: '#E08A5B',
  accentMuted: '#3A2A22',
  heroGradient: ['#2B1A38', '#7A3B54', '#C6603F'],
  heroGradientRich: ['#2B1A38', '#7A3B54', '#C6603F', '#EFA860'],
  heroOnGradient: '#FFF9F1',
  cardGlow: 'rgba(224, 138, 91, 0.3)',

  glass: 'rgba(36, 26, 43, 0.75)',
  glassStrong: 'rgba(46, 34, 51, 0.85)',
  glassEdge: 'rgba(255, 255, 255, 0.10)',
  hairline: 'rgba(255, 255, 255, 0.08)',
  aurora: ['#7A3B54', '#C6603F', '#3A2245'],
  auroraOpacity: [0.55, 0.32, 0.4],
  blurTint: 'dark',
  shadowColor: '#000000',

  expense: '#E8756A',
  expenseMuted: '#3A1E1C',
  income: '#6FCBA4',
  incomeMuted: '#1B332B',
  transfer: '#8CA0C4',
  transferMuted: '#232C3E',
  debtLent: '#6FCBA4',
  debtLentMuted: '#1B332B',
  debtBorrowed: '#F2A15C',
  debtBorrowedMuted: '#3A2B18',

  warning: '#F2C572',
  warningMuted: '#3A2E18',
  danger: '#E8756A',
  success: '#6FCBA4'
};

export const CATEGORY_PALETTE = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#84CC16', // Lime
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#14B8A6', // Teal
  '#64748B', // Slate
  '#78350F', // Warm Brown
  '#475569'  // Charcoal
];
