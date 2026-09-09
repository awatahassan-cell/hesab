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
  background: '#F5F3FC',
  surface: '#FFFFFF',
  surfaceSecondary: '#EFEBFA',
  surfaceSubtle: '#E6E0F7',
  cardBorder: '#E7E2F5',
  divider: '#EFEBFA',
  textPrimary: '#17142B',
  textSecondary: '#5C5877',
  textMuted: '#918DAA',
  textInverse: '#FFFFFF',
  accent: '#6D4AFF',
  accentMuted: '#EEEAFF',
  heroGradient: ['#6D4AFF', '#8B5CF6', '#06AED4'],
  cardGlow: 'rgba(109, 74, 255, 0.22)',

  glass: 'rgba(255, 255, 255, 0.68)',
  glassStrong: 'rgba(255, 255, 255, 0.82)',
  glassEdge: 'rgba(255, 255, 255, 0.90)',
  hairline: 'rgba(24, 20, 52, 0.07)',
  aurora: ['#A78BFA', '#67E8F9', '#FDA4AF'],
  auroraOpacity: [0.62, 0.5, 0.42],
  blurTint: 'light',
  shadowColor: '#302266',

  expense: '#E11D6B',
  expenseMuted: '#FCE7F0',
  income: '#059669',
  incomeMuted: '#D8F5E9',
  transfer: '#06AED4',
  transferMuted: '#D7F4FA',
  debtLent: '#B45309',
  debtLentMuted: '#FDF0DC',
  debtBorrowed: '#C2410C',
  debtBorrowedMuted: '#FDEBE0',

  warning: '#D97706',
  warningMuted: '#FDF0DC',
  danger: '#E11D6B',
  success: '#059669'
};

export const darkColors: ColorTheme = {
  isDark: true,
  background: '#07070B',
  surface: '#12121C',
  surfaceSecondary: '#1A1A28',
  surfaceSubtle: '#232338',
  cardBorder: '#232336',
  divider: '#1C1C2B',
  textPrimary: '#F5F5F7',
  textSecondary: '#9C99AE',
  textMuted: '#6E6B80',
  textInverse: '#07070B',
  accent: '#8B6DFF',
  accentMuted: '#1E1740',
  heroGradient: ['#7C5CFF', '#6D4AFF', '#22D3EE'],
  cardGlow: 'rgba(124, 92, 255, 0.32)',

  glass: 'rgba(255, 255, 255, 0.06)',
  glassStrong: 'rgba(255, 255, 255, 0.10)',
  glassEdge: 'rgba(255, 255, 255, 0.09)',
  hairline: 'rgba(255, 255, 255, 0.08)',
  aurora: ['#7C5CFF', '#22D3EE', '#F43F8E'],
  auroraOpacity: [0.78, 0.34, 0.26],
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
