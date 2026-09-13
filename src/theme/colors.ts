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
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surfaceSubtle: '#E2E8F0',
  cardBorder: '#E2E8F0',
  divider: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  accent: '#2563EB',
  accentMuted: '#EFF6FF',
  heroGradient: ['#1E40AF', '#2563EB', '#06B6D4'],
  cardGlow: 'rgba(37, 99, 235, 0.25)',

  glass: 'rgba(255, 255, 255, 0.72)',
  glassStrong: 'rgba(255, 255, 255, 0.88)',
  glassEdge: 'rgba(255, 255, 255, 0.95)',
  hairline: 'rgba(15, 23, 42, 0.06)',
  aurora: ['#60A5FA', '#38BDF8', '#818CF8'],
  auroraOpacity: [0.55, 0.45, 0.35],
  blurTint: 'light',
  shadowColor: '#1E293B',

  expense: '#E11D48',
  expenseMuted: '#FFE4E6',
  income: '#059669',
  incomeMuted: '#D1FAE5',
  transfer: '#0284C7',
  transferMuted: '#E0F2FE',
  debtLent: '#D97706',
  debtLentMuted: '#FEF3C7',
  debtBorrowed: '#EA580C',
  debtBorrowedMuted: '#FFEDD5',

  warning: '#D97706',
  warningMuted: '#FEF3C7',
  danger: '#E11D48',
  success: '#059669'
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
