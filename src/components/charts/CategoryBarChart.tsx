import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { formatCurrency } from '../../utils/currency';
import { FONT_FAMILY, FONT_FAMILY_BOLD, FONT_FAMILY_MEDIUM } from '../../theme/typography';
import { DonutSlice } from './DonutChart';

interface CategoryBarChartProps {
  slices: DonutSlice[];
  totalAmount: number;
  currency: string;
  onPress?: () => void;
  isRTL?: boolean;
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({
  slices,
  totalAmount,
  currency,
  onPress,
  isRTL = true
}) => {
  const { colors, radius } = useTheme();
  const { t } = useTranslation();

  if (!slices || slices.length === 0) {
    return null;
  }

  // Top 5 categories
  const topSlices = slices.slice(0, 5);
  const maxAmount = Math.max(...topSlices.map((s) => s.amount), 1);
  const topSlice = topSlices[0];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder,
          borderRadius: radius.lg || 20
        }
      ]}
    >
      {/* Header Row */}
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('home.spend_breakdown_monthly', 'بڕی خەرجی بەپێی بەشەکان')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t('home.highest_category', 'گەورەترین خەرجی: ')}
            <Text style={{ color: colors.accent, fontFamily: FONT_FAMILY_BOLD }}>{topSlice?.name || ''}</Text>
          </Text>
        </View>

        <View style={[styles.totalBadge, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}>
          <Text style={[styles.totalText, { color: colors.textPrimary }]}>
            {formatCurrency(totalAmount, currency, { isRTL })}
          </Text>
        </View>
      </View>

      {/* Bar Chart Area */}
      <View style={[styles.barsWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {topSlices.map((slice, index) => {
          const heightRatio = Math.max(0.18, slice.amount / maxAmount);
          const isHighest = index === 0;
          const barHeight = Math.round(heightRatio * 90);

          return (
            <View key={slice.id || index} style={styles.barColumn}>
              {/* Callout on the highest bar */}
              {isHighest ? (
                <View style={[styles.calloutBox, { backgroundColor: colors.textPrimary }]}>
                  <Text style={[styles.calloutText, { color: colors.surface }]}>
                    {formatCurrency(slice.amount, currency, { isRTL })}
                  </Text>
                  <View style={[styles.calloutTriangle, { borderTopColor: colors.textPrimary }]} />
                </View>
              ) : (
                <View style={styles.calloutSpacer} />
              )}

              {/* The Vertical Bar */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: barHeight,
                      backgroundColor: slice.color || colors.accent,
                      opacity: isHighest ? 1 : 0.75
                    }
                  ]}
                />
              </View>

              {/* Category Name Label */}
              <Text
                numberOfLines={1}
                style={[
                  styles.categoryLabel,
                  {
                    color: isHighest ? colors.textPrimary : colors.textMuted,
                    fontFamily: isHighest ? FONT_FAMILY_BOLD : FONT_FAMILY_MEDIUM
                  }
                ]}
              >
                {slice.name}
              </Text>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 14,
    marginBottom: 2
  },
  subtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 11
  },
  totalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1
  },
  totalText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 12
  },
  barsWrapper: {
    height: 145,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 2
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 3
  },
  calloutBox: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
    alignItems: 'center'
  },
  calloutText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 10
  },
  calloutTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    bottom: -4
  },
  calloutSpacer: {
    height: 22,
    marginBottom: 6
  },
  barTrack: {
    width: '100%',
    maxWidth: 38,
    height: 90,
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  barFill: {
    width: '100%',
    borderRadius: 12
  },
  categoryLabel: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center'
  }
});
