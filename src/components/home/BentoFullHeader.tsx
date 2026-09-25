import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { formatCurrency, convertCurrency, formatNumber, getCurrencySymbol } from '../../utils/currency';
import { FONT_FAMILY, FONT_FAMILY_BOLD, FONT_FAMILY_MEDIUM, FONT_FAMILY_SEMIBOLD } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { formatLocalDate } from '../../utils/dates';
import { elevation } from '../../theme/spacing';

interface BentoFullHeaderProps {
  topInset: number;
  monthNetBalance: number;
  monthIncome: number;
  monthExpense: number;
  activeCurrency: string;
  primaryCurrency: string;
  referenceCurrency: string;
  exchangeRates: Record<string, number>;
  marketRate100USD: number;
  isRTL: boolean;
  unpaidRemindersCount: number;
  onToggleCurrency: () => void;
  onOpenRateModal: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
}

/**
 * The quiet-light home header — "ڕووناکی".
 *
 * No gradient, no blur, no aurora: the balance is the only thing asking for
 * attention, set large and in the app's one accent colour. Everything else
 * (period, currency, cashflow, market rate) sits at a lower register so nothing
 * competes with the number a person actually opened the app to see.
 */
export const BentoFullHeader: React.FC<BentoFullHeaderProps> = ({
  topInset,
  monthNetBalance,
  monthIncome,
  monthExpense,
  activeCurrency,
  primaryCurrency,
  referenceCurrency,
  exchangeRates,
  marketRate100USD,
  isRTL,
  unpaidRemindersCount,
  onToggleCurrency,
  onOpenRateModal,
  onOpenProfile,
  onOpenNotifications
}) => {
  const { colors, radius } = useTheme();
  const { t, i18n } = useTranslation();

  const altCurrency = activeCurrency === primaryCurrency ? referenceCurrency : primaryCurrency;
  const altBalance = convertCurrency(monthNetBalance, activeCurrency, altCurrency, exchangeRates);
  const isPositive = monthNetBalance >= 0;
  const row = isRTL ? 'row-reverse' : ('row' as const);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
      {/* Top Bar: Profile, period badge, notifications */}
      <View style={[styles.topBarRow, { flexDirection: row }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenProfile}
          style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        >
          <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.periodPill, { backgroundColor: colors.surfaceSecondary, flexDirection: row }]}>
          <Text style={[styles.periodTextMuted, { color: colors.textMuted }]}>{t('reports.period_day')}</Text>
          <View style={[styles.periodActivePill, { backgroundColor: colors.surface }, elevation.sm(colors.shadowColor)]}>
            <Text style={[styles.periodTextActive, { color: colors.accent }]}>{t('reports.period_month')}</Text>
          </View>
          <Text style={[styles.periodTextMuted, { color: colors.textMuted }]}>{t('reports.period_year')}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenNotifications}
          style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        >
          <Ionicons name="notifications-outline" size={16} color={colors.textSecondary} />
          {unpaidRemindersCount > 0 && (
            <View style={[styles.notifBadge, { backgroundColor: colors.warning, borderColor: colors.background }]}>
              <Text style={styles.notifBadgeText}>{unpaidRemindersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Date & currency switcher */}
      <View style={[styles.subRow, { flexDirection: row }]}>
        <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
          {formatLocalDate(new Date(), i18n.language)}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onToggleCurrency}
          style={[styles.currencyPill, { backgroundColor: colors.surfaceSecondary, flexDirection: row }]}
        >
          {[primaryCurrency, referenceCurrency].map((code) => {
            const active = activeCurrency === code;
            return (
              <View
                key={code}
                style={[
                  styles.currencySegment,
                  active && { backgroundColor: colors.surface },
                  active && elevation.sm(colors.shadowColor)
                ]}
              >
                <Text
                  style={[
                    styles.currencyCodeText,
                    { fontFamily: active ? FONT_FAMILY_BOLD : FONT_FAMILY, color: active ? colors.accent : colors.textMuted }
                  ]}
                >
                  {getCurrencySymbol(code)} {code}
                </Text>
              </View>
            );
          })}
        </TouchableOpacity>
      </View>

      {/* Central balance display — the one thing on this screen asking to be read */}
      <View style={[styles.balanceCenter, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.balanceSuperTitle, { color: colors.textMuted }]}>
          {t('home.net_balance_month')}
        </Text>
        <Text
          style={[styles.balanceAmountText, { color: colors.textPrimary }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatCurrency(monthNetBalance, activeCurrency, { isRTL })}
        </Text>
        <Text style={[styles.altBalanceText, { color: colors.textMuted }]}>
          ≈ {formatCurrency(altBalance, altCurrency, { isRTL })}
        </Text>
      </View>

      {/* Cashflow: income vs expense, as plain columns under a hairline */}
      <View style={[styles.cashflowRow, { borderTopColor: colors.divider, flexDirection: row }]}>
        <View style={[styles.cashflowCol, { flexDirection: row }]}>
          <View style={[styles.flowIconBadge, { backgroundColor: colors.incomeMuted, borderRadius: radius.sm }]}>
            <Ionicons name="arrow-down" size={13} color={colors.income} />
          </View>
          <View style={styles.flowTextWrap}>
            <Text style={[styles.cashflowLabel, { color: colors.textMuted }]}>{t('home.month_income')}</Text>
            <Text style={[styles.cashflowAmount, { color: colors.income }]}>
              +{formatCurrency(monthIncome, activeCurrency, { isRTL })}
            </Text>
          </View>
        </View>

        <View style={[styles.vDivider, { backgroundColor: colors.divider }]} />

        <View style={[styles.cashflowCol, { flexDirection: row }]}>
          <View style={[styles.flowIconBadge, { backgroundColor: colors.expenseMuted, borderRadius: radius.sm }]}>
            <Ionicons name="arrow-up" size={13} color={colors.expense} />
          </View>
          <View style={styles.flowTextWrap}>
            <Text style={[styles.cashflowLabel, { color: colors.textMuted }]}>{t('home.monthly_expense')}</Text>
            <Text style={[styles.cashflowAmount, { color: colors.expense }]}>
              -{formatCurrency(monthExpense, activeCurrency, { isRTL })}
            </Text>
          </View>
        </View>
      </View>

      {/* Market rate — a quiet, tappable line, not a competing headline */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onOpenRateModal}
        style={[styles.marketRateRow, { backgroundColor: colors.surfaceSecondary, flexDirection: row }]}
      >
        <Ionicons name="swap-horizontal" size={13} color={colors.textMuted} />
        <Text style={[styles.marketRateText, { color: colors.textSecondary }]}>
          {t('common.market_rate')}: 100$ = {formatNumber(marketRate100USD || 0)}{' '}
          {getCurrencySymbol(primaryCurrency)}
        </Text>
        <Ionicons name="pencil" size={11} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 18
  },
  topBarRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: FONT_FAMILY_BOLD
  },
  periodPill: {
    borderRadius: 18,
    padding: 3,
    alignItems: 'center',
    gap: 2
  },
  periodTextMuted: {
    fontSize: 11,
    fontFamily: FONT_FAMILY_MEDIUM,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  periodActivePill: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  periodTextActive: {
    fontSize: 11,
    fontFamily: FONT_FAMILY_BOLD
  },
  subRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY_MEDIUM
  },
  currencyPill: {
    borderRadius: 12,
    padding: 2,
    alignItems: 'center'
  },
  currencySegment: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10
  },
  currencyCodeText: {
    fontSize: 10.5
  },
  balanceCenter: {
    marginBottom: 18
  },
  balanceSuperTitle: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY_MEDIUM,
    marginBottom: 4
  },
  balanceAmountText: {
    fontSize: 40,
    fontFamily: FONT_FAMILY_BOLD,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums']
  },
  altBalanceText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY_SEMIBOLD,
    marginTop: 3,
    fontVariant: ['tabular-nums']
  },
  cashflowRow: {
    borderTopWidth: 1,
    paddingTop: 14,
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cashflowCol: {
    flex: 1,
    alignItems: 'center'
  },
  flowIconBadge: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center'
  },
  flowTextWrap: {
    marginHorizontal: 8
  },
  cashflowLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY
  },
  cashflowAmount: {
    fontSize: 14,
    fontFamily: FONT_FAMILY_BOLD,
    marginTop: 1,
    fontVariant: ['tabular-nums']
  },
  vDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 8
  },
  marketRateRow: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14
  },
  marketRateText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY_MEDIUM
  }
});
