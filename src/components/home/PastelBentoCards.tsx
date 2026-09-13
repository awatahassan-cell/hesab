import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { formatCurrency } from '../../utils/currency';
import { FONT_FAMILY, FONT_FAMILY_BOLD, FONT_FAMILY_MEDIUM } from '../../theme/typography';
import { DonutSlice } from '../charts/DonutChart';

interface PastelBentoCardsProps {
  slices: DonutSlice[];
  currency: string;
  isRTL?: boolean;
  onSeeAll?: () => void;
  onSelectCategory?: (id: string) => void;
}

interface PastelTheme {
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  iconBgLight: string;
  iconBgDark: string;
  textLight: string;
  textDark: string;
  barColor: string;
  icon: any;
}

const PASTEL_THEMES: PastelTheme[] = [
  // 1. Peach (Food / Dining)
  {
    bgLight: '#FFF7ED',
    bgDark: '#2A180E',
    borderLight: '#FFEDD5',
    borderDark: '#452210',
    iconBgLight: '#FFEDD5',
    iconBgDark: '#381C0E',
    textLight: '#C2410C',
    textDark: '#FB923C',
    barColor: '#F97316',
    icon: 'restaurant-outline'
  },
  // 2. Lilac (Education / Courses)
  {
    bgLight: '#EEF2FF',
    bgDark: '#171A36',
    borderLight: '#E0E7FF',
    borderDark: '#282D5E',
    iconBgLight: '#E0E7FF',
    iconBgDark: '#20244D',
    textLight: '#4338CA',
    textDark: '#A5B4FC',
    barColor: '#6366F1',
    icon: 'school-outline'
  },
  // 3. Mint (Shopping / Groceries)
  {
    bgLight: '#ECFDF5',
    bgDark: '#0D291D',
    borderLight: '#D1FAE5',
    borderDark: '#164833',
    iconBgLight: '#D1FAE5',
    iconBgDark: '#123928',
    textLight: '#047857',
    textDark: '#6EE7B7',
    barColor: '#10B981',
    icon: 'cart-outline'
  },
  // 4. Sky (Transport / Fuel)
  {
    bgLight: '#F0F9FF',
    bgDark: '#0F2538',
    borderLight: '#E0F2FE',
    borderDark: '#173D5E',
    iconBgLight: '#E0F2FE',
    iconBgDark: '#13314B',
    textLight: '#0369A1',
    textDark: '#7DD3FC',
    barColor: '#0284C7',
    icon: 'car-outline'
  },
  // 5. Rose (Health / Personal)
  {
    bgLight: '#FFF1F2',
    bgDark: '#2D1217',
    borderLight: '#FFE4E6',
    borderDark: '#4A1D27',
    iconBgLight: '#FFE4E6',
    iconBgDark: '#3B171F',
    textLight: '#BE123C',
    textDark: '#FDA4AF',
    barColor: '#F43F5E',
    icon: 'heart-outline'
  }
];

export const PastelBentoCards: React.FC<PastelBentoCardsProps> = ({
  slices,
  currency,
  isRTL = true,
  onSeeAll,
  onSelectCategory
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  if (!slices || slices.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('home.budget_categories', 'بەشە پاستێلەکان (Bento Cards)')}
        </Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={[styles.seeAllText, { color: colors.accent }]}>
              {t('home.see_all', 'هەمووی')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        {slices.slice(0, 6).map((slice, index) => {
          const theme = PASTEL_THEMES[index % PASTEL_THEMES.length];
          const pct = Math.min(100, slice.percentage || 25);

          return (
            <TouchableOpacity
              key={slice.id || index}
              activeOpacity={0.8}
              onPress={() => onSelectCategory?.(slice.id)}
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? theme.bgDark : theme.bgLight,
                  borderColor: isDark ? theme.borderDark : theme.borderLight
                }
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? theme.iconBgDark : theme.iconBgLight }]}>
                <Ionicons name={theme.icon} size={18} color={isDark ? theme.textDark : theme.textLight} />
              </View>

              <Text numberOfLines={1} style={[styles.categoryName, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                {slice.name}
              </Text>

              <Text style={[styles.amountText, { color: isDark ? theme.textDark : theme.textLight }]}>
                {formatCurrency(slice.amount, currency, { isRTL })}
              </Text>

              {/* Progress mini bar */}
              <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: theme.barColor }]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 10
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 14
  },
  seeAllText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 12
  },
  scrollContent: {
    paddingHorizontal: 2,
    gap: 10
  },
  card: {
    width: 128,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1.5
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  categoryName: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 11,
    marginBottom: 2
  },
  amountText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 12,
    marginBottom: 8
  },
  progressTrack: {
    height: 4.5,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%'
  },
  progressFill: {
    height: '100%',
    borderRadius: 3
  }
});
