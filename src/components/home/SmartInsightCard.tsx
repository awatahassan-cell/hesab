import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { FONT_FAMILY_BOLD, FONT_FAMILY_SEMIBOLD, FONT_FAMILY } from '../../theme/typography';
import { elevation } from '../../theme/spacing';
import { formatCurrency } from '../../utils/currency';

interface SmartInsightCardProps {
  monthIncome: number;
  monthExpense: number;
  currency: string;
  isRTL: boolean;
  onPressDetails?: () => void;
}

export const SmartInsightCard: React.FC<SmartInsightCardProps> = ({
  monthIncome,
  monthExpense,
  currency,
  isRTL,
  onPressDetails
}) => {
  const { colors, radius } = useTheme();
  const { t } = useTranslation();

  // Determine smart insight
  let iconName: any = 'sparkles';
  let iconBg = colors.accentMuted;
  let iconColor = colors.accent;
  let title = t('insights.title_default');
  let message = t('insights.body_default');

  if (monthIncome > 0 && monthExpense > 0) {
    const savings = monthIncome - monthExpense;
    const savingsRate = Math.round((savings / monthIncome) * 100);

    if (savingsRate >= 25) {
      iconName = 'leaf';
      iconBg = colors.incomeMuted;
      iconColor = colors.income;
      title = t('insights.saving_well_title');
      message = t('insights.saving_well_body', {
        percent: savingsRate,
        amount: formatCurrency(savings, currency, { isRTL })
      });
    } else if (savingsRate < 0) {
      iconName = 'warning-outline';
      iconBg = colors.expenseMuted;
      iconColor = colors.expense;
      title = t('insights.over_budget_title');
      message = t('insights.over_budget_body', {
        amount: formatCurrency(Math.abs(savings), currency, { isRTL })
      });
    } else {
      iconName = 'trending-up';
      iconBg = colors.accentMuted;
      iconColor = colors.accent;
      title = t('insights.balanced_title');
      message = t('insights.balanced_body', { percent: 100 - savingsRate });
    }
  } else if (monthExpense > 0 && monthIncome === 0) {
    iconName = 'wallet-outline';
    iconBg = colors.warningMuted;
    iconColor = colors.warning;
    title = t('insights.expense_only_title');
    message = t('insights.expense_only_body', {
      amount: formatCurrency(monthExpense, currency, { isRTL })
    });
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPressDetails}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder,
          borderRadius: radius.lg
        },
        elevation.sm(colors.shadowColor)
      ]}
    >
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      </View>

      <Text style={[styles.message, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
        {message}
      </Text>

      {onPressDetails && (
        <View style={[styles.footerRow, { borderTopColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.linkText, { color: colors.accent }]}>{t('insights.view_reports')}</Text>
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={14}
            color={colors.accent}
            style={{ marginHorizontal: 4 }}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginBottom: 14,
    borderWidth: 1
  },
  headerRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 14,
    fontWeight: '700'
  },
  message: {
    fontFamily: FONT_FAMILY,
    fontSize: 12.5,
    lineHeight: 19
  },
  footerRow: {
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  linkText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 12,
    fontWeight: '600'
  }
});
