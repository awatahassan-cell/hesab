import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { formatCurrency } from '../../utils/currency';
import { useAppStore } from '../../store/useAppStore';

interface CategorySlice {
  category_id: string;
  category_name_key: string;
  category_custom_name?: string;
  icon: string;
  color: string;
  total_amount: number;
  percentage: number;
}

interface CategoryPieChartProps {
  data: CategorySlice[];
  currency: string;
  onSelectCategory?: (categoryId: string) => void;
  selectedCategoryId?: string;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  data,
  currency,
  onSelectCategory,
  selectedCategoryId
}) => {
  const { colors, typography, radius } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);

  if (!data || data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[typography.bodySmall, { color: colors.textMuted }]}>
          {t('reports.no_chart_data')}
        </Text>
      </View>
    );
  }

  const grandTotal = data.reduce((acc, d) => acc + d.total_amount, 0);

  return (
    <View style={styles.container}>
      {/* Stacked Proportional Bar (Clean, accessible, beautiful notebook style) */}
      <View style={[styles.proportionalBar, { borderRadius: radius.round, backgroundColor: colors.surfaceSecondary }]}>
        {data.map((item) => (
          <TouchableOpacity
            key={item.category_id}
            activeOpacity={0.8}
            onPress={() => onSelectCategory && onSelectCategory(item.category_id)}
            style={{
              width: `${Math.max(2, item.percentage)}%`,
              backgroundColor: item.color,
              height: 18,
              borderTopLeftRadius: radius.round,
              borderBottomLeftRadius: radius.round
            }}
          />
        ))}
      </View>

      {/* Legend & Breakdown List */}
      <View style={styles.legendList}>
        {data.map((item) => {
          const isSelected = selectedCategoryId === item.category_id;
          const name = item.category_custom_name || t(`categories.names.${item.category_name_key}`, item.category_name_key);

          return (
            <TouchableOpacity
              key={item.category_id}
              activeOpacity={0.7}
              onPress={() => onSelectCategory && onSelectCategory(item.category_id)}
              style={[
                styles.legendRow,
                {
                  backgroundColor: isSelected ? colors.surfaceSecondary : 'transparent',
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: radius.md,
                  flexDirection: isRTL ? 'row-reverse' : 'row'
                }
              ]}
            >
              <View style={[styles.legendLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                <Text style={[typography.bodySemibold, { color: colors.textPrimary, marginHorizontal: 8 }]}>
                  {name}
                </Text>
              </View>

              <View style={[styles.legendRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[typography.tabularNumber, { color: colors.textPrimary }]}>
                  {formatCurrency(item.total_amount, currency, { isRTL })}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, marginHorizontal: 6 }]}>
                  {item.percentage}%
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8
  },
  proportionalBar: {
    height: 18,
    flexDirection: 'row',
    overflow: 'hidden',
    marginVertical: 12
  },
  legendList: {
    marginTop: 8
  },
  legendRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 2
  },
  legendLeft: {
    alignItems: 'center'
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  legendRight: {
    alignItems: 'center'
  },
  empty: {
    padding: 24,
    alignItems: 'center'
  }
});
