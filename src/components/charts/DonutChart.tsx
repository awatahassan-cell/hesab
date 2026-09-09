import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { formatCurrency } from '../../utils/currency';
import { useAppStore } from '../../store/useAppStore';
import { FONT_FAMILY, FONT_FAMILY_BOLD, FONT_FAMILY_SEMIBOLD, FONT_FAMILY_MEDIUM } from '../../theme/typography';
import { useTranslation } from 'react-i18next';

export interface DonutSlice {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
  icon?: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  totalAmount: number;
  currency: string;
  title?: string;
  onSlicePress?: (slice: DonutSlice) => void;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  slices,
  totalAmount,
  currency,
  title,
  onSlicePress
}) => {
  const { t } = useTranslation();
  const { colors, typography, radius } = useTheme();
  // Resolved here, not as a default parameter: t() is not in scope up there.
  const heading = title ?? t('reports.category_breakdown');
  const isRTL = useAppStore((state) => state.isRTL);

  if (!slices || slices.length === 0 || totalAmount <= 0) {
    return null;
  }

  // Slices sorted by percentage descending, take top 4 and combine rest as other
  const sorted = [...slices].sort((a, b) => b.percentage - a.percentage);
  const topSlices = sorted.slice(0, 4);
  const restSlices = sorted.slice(4);

  let finalSlices = [...topSlices];
  if (restSlices.length > 0) {
    const restTotal = restSlices.reduce((sum, s) => sum + s.amount, 0);
    const restPct = restSlices.reduce((sum, s) => sum + s.percentage, 0);
    finalSlices.push({
      id: 'other',
      name: t('charts.other_slices'),
      amount: restTotal,
      percentage: Math.round(restPct),
      color: '#94A3B8'
    });
  }

  const topSlice = finalSlices[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 12 }]}>
      {/* Title Header */}
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {heading}
        </Text>
        <Text style={[styles.totalPill, { backgroundColor: colors.accentMuted, color: colors.accent }]}>
          {formatCurrency(totalAmount, currency, { isRTL })}
        </Text>
      </View>

      {/* Multi-segment Distribution Bar */}
      <View style={[styles.barWrapper, { backgroundColor: colors.surfaceSecondary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {finalSlices.map((slice) => (
          <View
            key={slice.id}
            style={{
              flex: Math.max(slice.percentage, 2),
              height: '100%',
              backgroundColor: slice.color,
              marginHorizontal: 1,
              borderRadius: 3
            }}
          />
        ))}
      </View>

      {/* Top category highlight note */}
      {topSlice && (
        <View style={[styles.topHighlightRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.topHighlightText, { color: colors.textMuted }]}>
            {isRTL ? t('charts.top_spend') : 'Top expense:'}{' '}
            <Text style={{ color: topSlice.color, fontWeight: '700' }}>
              {topSlice.name} ({topSlice.percentage}%)
            </Text>
          </Text>
        </View>
      )}

      {/* 2-Column Sekkeh-style Legend */}
      <View style={styles.legendGrid}>
        {finalSlices.map((slice) => (
          <TouchableOpacity
            key={slice.id}
            activeOpacity={0.8}
            onPress={() => onSlicePress && onSlicePress(slice)}
            style={[
              styles.legendCard,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.cardBorder,
                flexDirection: isRTL ? 'row-reverse' : 'row'
              }
            ]}
          >
            <View style={[styles.colorDot, { backgroundColor: slice.color }]} />
            <View style={{ flex: 1, marginHorizontal: 6, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.sliceName, { color: colors.textPrimary }]} numberOfLines={1}>
                {slice.name}
              </Text>
              <Text style={[styles.sliceAmount, { color: colors.textMuted }]}>
                {formatCurrency(slice.amount, currency, { isRTL })}
              </Text>
            </View>
            <View style={[styles.pctBadge, { backgroundColor: slice.color + '20' }]}>
              <Text style={[styles.pctText, { color: slice.color }]}>
                {slice.percentage}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONT_FAMILY_BOLD
  },
  totalPill: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontFamily: FONT_FAMILY_BOLD
  },
  barWrapper: {
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 8,
    width: '100%',
    padding: 1
  },
  topHighlightRow: {
    alignItems: 'center',
    marginBottom: 10
  },
  topHighlightText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: FONT_FAMILY_MEDIUM
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8
  },
  legendCard: {
    width: '48%',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center'
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  sliceName: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONT_FAMILY_BOLD
  },
  sliceAmount: {
    fontSize: 10,
    marginTop: 1,
    fontFamily: FONT_FAMILY_MEDIUM
  },
  pctBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4
  },
  pctText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: FONT_FAMILY_BOLD
  }
});
