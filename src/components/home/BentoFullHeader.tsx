import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { formatCurrency, convertCurrency, formatNumber, getCurrencySymbol } from '../../utils/currency';
import { FONT_FAMILY, FONT_FAMILY_BOLD, FONT_FAMILY_MEDIUM, FONT_FAMILY_SEMIBOLD } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { formatLocalDate } from '../../utils/dates';

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
 * The dawn home header — "شەفەق".
 *
 * A warm four-stop gradient (plum through dusk-rose and terracotta to gold —
 * dawn read in reverse for dark mode, midday cream through terracotta for
 * light) carries the balance, with every chip on it a translucent overlay
 * rather than an opaque surface colour, so the same markup works over every
 * scheme's gradient — pale or deep — without a fork per chip.
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
  const { colors, radius, isDark } = useTheme();
  const { t, i18n } = useTranslation();

  const altCurrency = activeCurrency === primaryCurrency ? referenceCurrency : primaryCurrency;
  const altBalance = convertCurrency(monthNetBalance, activeCurrency, altCurrency, exchangeRates);
  const row = isRTL ? 'row-reverse' : ('row' as const);
  const ink = colors.heroOnGradient;

  // One translucent overlay family, tuned to the gradient's own depth (not
  // the app theme — some schemes run a deep gradient even in light mode) so
  // a pale and a deep gradient both still read as "frosted chip" rather than
  // disappearing into the gradient or turning opaque.
  const deep = colors.heroIsDark;
  const chipBg = deep ? 'rgba(255, 255, 255, 0.14)' : 'rgba(58, 35, 24, 0.10)';
  const chipBorder = deep ? 'rgba(255, 255, 255, 0.22)' : 'rgba(58, 35, 24, 0.16)';
  const chipActiveBg = deep ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.85)';
  // The active chip is near-white in every scheme; in dark mode the accent is
  // tuned to read on dark surfaces, so use the gradient's deep second stop
  // there for contrast.
  const activeInk = isDark ? colors.heroGradientRich[1] : colors.accent;

  return (
    <LinearGradient
      colors={colors.heroGradientRich}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.65, y: 1 }}
      style={[styles.container, { paddingTop: topInset, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl }]}
    >
      {/* Top Bar: Profile, period badge, notifications */}
      <View style={[styles.topBarRow, { flexDirection: row }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenProfile}
          style={[styles.iconBtn, { backgroundColor: chipBg, borderColor: chipBorder }]}
        >
          <Ionicons name="person-circle-outline" size={19} color={ink} />
        </TouchableOpacity>

        <View style={[styles.periodPill, { backgroundColor: chipBg, borderColor: chipBorder, flexDirection: row }]}>
          <Text style={[styles.periodTextMuted, { color: ink, opacity: 0.72 }]}>{t('reports.period_day')}</Text>
          <View style={[styles.periodActivePill, { backgroundColor: chipActiveBg }]}>
            <Text style={[styles.periodTextActive, { color: activeInk }]}>{t('reports.period_month')}</Text>
          </View>
          <Text style={[styles.periodTextMuted, { color: ink, opacity: 0.72 }]}>{t('reports.period_year')}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenNotifications}
          style={[styles.iconBtn, { backgroundColor: chipBg, borderColor: chipBorder }]}
        >
          <Ionicons name="notifications-outline" size={17} color={ink} />
          {unpaidRemindersCount > 0 && (
            <View style={[styles.notifBadge, { backgroundColor: colors.warning, borderColor: colors.heroGradientRich[0] }]}>
              <Text style={styles.notifBadgeText}>{unpaidRemindersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Date & currency switcher */}
      <View style={[styles.subRow, { flexDirection: row }]}>
        <Text style={[styles.dateLabel, { color: ink, opacity: 0.78 }]}>
          {formatLocalDate(new Date(), i18n.language)}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onToggleCurrency}
          style={[styles.currencyPill, { backgroundColor: chipBg, borderColor: chipBorder, flexDirection: row }]}
        >
          {[primaryCurrency, referenceCurrency].map((code) => {
            const active = activeCurrency === code;
            return (
              <View
                key={code}
                style={[styles.currencySegment, active && { backgroundColor: chipActiveBg }]}
              >
                <Text
                  style={[
                    styles.currencyCodeText,
                    { fontFamily: active ? FONT_FAMILY_BOLD : FONT_FAMILY, color: active ? activeInk : ink, opacity: active ? 1 : 0.78 }
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
        <Text style={[styles.balanceSuperTitle, { color: ink, opacity: 0.78 }]}>
          {t('home.net_balance_month')}
        </Text>
        <Text
          style={[styles.balanceAmountText, { color: ink }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatCurrency(monthNetBalance, activeCurrency, { isRTL })}
        </Text>
        <Text style={[styles.altBalanceText, { color: ink, opacity: 0.78 }]}>
          ≈ {formatCurrency(altBalance, altCurrency, { isRTL })}
        </Text>
      </View>

      {/* Cashflow: income vs expense, inside one frosted panel so the
          semantic income/expense colours stay legible over the gradient. */}
      <View style={[styles.cashflowPanel, { backgroundColor: chipBg, borderColor: chipBorder, flexDirection: row }]}>
        <View style={[styles.cashflowCol, { flexDirection: row }]}>
          <View style={[styles.flowIconBadge, { backgroundColor: chipActiveBg, borderRadius: radius.sm }]}>
            <Ionicons name="arrow-down-circle-outline" size={15} color={colors.income} />
          </View>
          <View style={styles.flowTextWrap}>
            <Text style={[styles.cashflowLabel, { color: ink, opacity: 0.78 }]}>{t('home.month_income')}</Text>
            <Text style={[styles.cashflowAmount, { color: ink }]}>
              +{formatCurrency(monthIncome, activeCurrency, { isRTL })}
            </Text>
          </View>
        </View>

        <View style={[styles.vDivider, { backgroundColor: chipBorder }]} />

        <View style={[styles.cashflowCol, { flexDirection: row }]}>
          <View style={[styles.flowIconBadge, { backgroundColor: chipActiveBg, borderRadius: radius.sm }]}>
            <Ionicons name="arrow-up-circle-outline" size={15} color={colors.expense} />
          </View>
          <View style={styles.flowTextWrap}>
            <Text style={[styles.cashflowLabel, { color: ink, opacity: 0.78 }]}>{t('home.monthly_expense')}</Text>
            <Text style={[styles.cashflowAmount, { color: ink }]}>
              -{formatCurrency(monthExpense, activeCurrency, { isRTL })}
            </Text>
          </View>
        </View>
      </View>

      {/* Market rate — a quiet, tappable line, not a competing headline */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onOpenRateModal}
        style={[styles.marketRateRow, { backgroundColor: chipBg, borderColor: chipBorder, flexDirection: row }]}
      >
        <Ionicons name="swap-horizontal-outline" size={13} color={ink} style={{ opacity: 0.85 }} />
        <Text style={[styles.marketRateText, { color: ink, opacity: 0.85 }]}>
          {t('common.market_rate')}: 100$ = {formatNumber(marketRate100USD || 0)}{' '}
          {getCurrencySymbol(primaryCurrency)}
        </Text>
        <Ionicons name="pencil-outline" size={11} color={ink} style={{ opacity: 0.7 }} />
      </TouchableOpacity>
    </LinearGradient>
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
    borderWidth: 1,
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
    borderWidth: 1,
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
  cashflowPanel: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
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
    marginHorizontal: 4
  },
  marketRateRow: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1
  },
  marketRateText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY_MEDIUM
  }
});
