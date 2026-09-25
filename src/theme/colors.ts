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

export const lightColors: ColorTheme = {
  isDark: false,
  // "ڕووناکی" (Ronakî / Quiet Light) — a warm near-black on an off-white
  // ground, one teal accent standing in for every shade of blue the old
  // palette scattered around. Every hue below is chosen, not inherited.
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F3F7',
  surfaceSubtle: '#E7EAF0',
  cardBorder: '#E6E9EF',
  divider: '#EEF0F4',
  textPrimary: '#12161F',
  textSecondary: '#5A6274',
  textMuted: '#8A91A0',
  textInverse: '#FFFFFF',
  accent: '#0F766E',
  accentMuted: '#E7F3F0',
  heroGradient: ['#0B4F49', '#0F766E', '#14B8A6'],
  cardGlow: 'rgba(15, 118, 110, 0.22)',

  glass: 'rgba(255, 255, 255, 0.72)',
  glassStrong: 'rgba(255, 255, 255, 0.88)',
  glassEdge: 'rgba(255, 255, 255, 0.95)',
  hairline: 'rgba(18, 22, 31, 0.07)',
  aurora: ['#5EEAD4', '#99F6E4', '#0D9488'],
  auroraOpacity: [0.4, 0.3, 0.22],
  blurTint: 'light',
  shadowColor: '#12161F',

  expense: '#B42318',
  expenseMuted: '#FBEDEC',
  income: '#0F766E',
  incomeMuted: '#E7F3F0',
  transfer: '#4C6B8A',
  transferMuted: '#EAF0F5',
  debtLent: '#8A6D2F',
  debtLentMuted: '#F5EFE0',
  debtBorrowed: '#9A3B12',
  debtBorrowedMuted: '#FBEAE0',

  warning: '#B7791F',
  warningMuted: '#FDF3E0',
  danger: '#B42318',
  success: '#0F766E'
};

export const darkColors: ColorTheme = {
  isDark: true,
  background: '#0B0F19',
  surface: '#131B2E',
  surfaceSecondary: '#1C2740',
  surfaceSubtle: '#263554',
  cardBorder: '#202D47',
  divider: '#182238',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0B0F19',
  accent: '#38BDF8',
  accentMuted: '#082F49',
  heroGradient: ['#1E3A8A', '#1D4ED8', '#0284C7'],
  cardGlow: 'rgba(56, 189, 248, 0.32)',

  glass: 'rgba(19, 27, 46, 0.75)',
  glassStrong: 'rgba(28, 39, 64, 0.85)',
  glassEdge: 'rgba(255, 255, 255, 0.10)',
  hairline: 'rgba(255, 255, 255, 0.08)',
  aurora: ['#1E40AF', '#0369A1', '#4338CA'],
  auroraOpacity: [0.75, 0.35, 0.25],
  blurTint: 'dark',
  shadowColor: '#000000',

  expense: '#FB7185',
  expenseMuted: '#3A1024',
  income: '#34D399',
  incomeMuted: '#06331F',
  transfer: '#38BDF8',
  transferMuted: '#07364C',
  debtLent: '#FBBF24',
  debtLentMuted: '#332510',
  debtBorrowed: '#FB923C',
  debtBorrowedMuted: '#331D0F',

  warning: '#FBBF24',
  warningMuted: '#332510',
  danger: '#FB7185',
  success: '#34D399'
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
