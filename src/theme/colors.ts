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
  background: '#F6F8FD',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F3FC',
  surfaceSubtle: '#E7EBF9',
  cardBorder: '#E2E7F6',
  divider: '#EEF1FA',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#8E9BAE',
  textInverse: '#FFFFFF',
  accent: '#5B42F3',
  accentMuted: '#EEECFD',
  heroGradient: ['#4338CA', '#6366F1', '#7C3AED'],
  cardGlow: 'rgba(99, 102, 241, 0.25)',

  expense: '#F43F5E',
  expenseMuted: '#FFE4E6',
  income: '#10B981',
  incomeMuted: '#DCFCE7',
  transfer: '#0EA5E9',
  transferMuted: '#E0F2FE',
  debtLent: '#D97706',
  debtLentMuted: '#FEF3C7',
  debtBorrowed: '#EA580C',
  debtBorrowedMuted: '#FFEDD5',

  warning: '#F59E0B',
  warningMuted: '#FEF3C7',
  danger: '#F43F5E',
  success: '#10B981'
};

export const darkColors: ColorTheme = {
  isDark: true,
  background: '#0B0E18',
  surface: '#13192B',
  surfaceSecondary: '#1C243D',
  surfaceSubtle: '#263052',
  cardBorder: '#253053',
  divider: '#1D2542',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0B0E18',
  accent: '#7D5FFF',
  accentMuted: '#261F54',
  heroGradient: ['#2E1065', '#4C1D95', '#5B21B6'],
  cardGlow: 'rgba(125, 95, 255, 0.3)',

  expense: '#FB7185',
  expenseMuted: '#4C0519',
  income: '#34D399',
  incomeMuted: '#064E3B',
  transfer: '#38BDF8',
  transferMuted: '#0C4A6E',
  debtLent: '#FBBF24',
  debtLentMuted: '#3E2F0A',
  debtBorrowed: '#FB923C',
  debtBorrowedMuted: '#3E240D',

  warning: '#FBBF24',
  warningMuted: '#3E2F0A',
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
