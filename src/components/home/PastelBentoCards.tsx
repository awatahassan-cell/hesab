import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { formatCurrency } from '../../utils/currency';
import { FONT_FAMILY_BOLD, FONT_FAMILY_MEDIUM } from '../../theme/typography';
import { DonutSlice } from '../charts/DonutChart';

interface PastelBentoCardsProps {
  slices: DonutSlice[];
  currency: string;
  isRTL?: boolean;
  onSeeAll?: () => void;
  onSelectCategory?: (id: string) => void;
}

/**
 * Quick per-category glance — flat cards, each carrying only its own
 * category's real colour and icon (not a five-item palette cycled by
 * position, which used to paint a "food" icon on whatever category
 * happened to land in slot one).
 */
export const PastelBentoCards: React.FC<PastelBentoCardsProps> = ({
  slices,
  currency,
  isRTL = true,
  onSeeAll,
  onSelectCategory
}) => {
  const { colors, radius } = useTheme();
  const { t } = useTranslation();

  if (!slices || slices.length === 0) {
    return null;
  }

  const row = isRTL ? 'row-reverse' : ('row' as const);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.headerRow, { flexDirection: row }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('home.budget_categories')}
        </Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={[styles.seeAllText, { color: colors.accent }]}>
              {t('home.see_all')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { flexDirection: row }]}
      >
        {slices.slice(0, 6).map((slice, index) => {
          const pct = Math.min(100, slice.percentage || 0);
          const tint = slice.color || colors.accent;

          return (
            <TouchableOpacity
              key={slice.id || index}
              activeOpacity={0.8}
              onPress={() => onSelectCategory?.(slice.id)}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg }
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: tint + '1A', borderRadius: radius.sm }]}>
                <Ionicons name={(slice.icon as any) || 'pricetag-outline'} size={18} color={tint} />
              </View>

              <Text numberOfLines={1} style={[styles.categoryName, { color: colors.textSecondary }]}>
                {slice.name}
              </Text>

              <Text style={[styles.amountText, { color: colors.textPrimary }]} numberOfLines={1}>
                {formatCurrency(slice.amount, currency, { isRTL })}
              </Text>

              <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSecondary }]}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: tint }]} />
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
    borderWidth: 1
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  categoryName: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 11,
    marginBottom: 3
  },
  amountText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 13,
    marginBottom: 9,
    fontVariant: ['tabular-nums']
  },
  progressTrack: {
    height: 4,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%'
  },
  progressFill: {
    height: '100%',
    borderRadius: 3
  }
});
