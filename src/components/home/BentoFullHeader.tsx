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
  onOpenStories?: () => void;
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
  onOpenNotifications,
  onOpenStories
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
      {/* Top bar: avatar + stories | currency | bell */}
      <View style={[styles.topBarRow, { flexDirection: row }]}>
        <View style={[styles.heroLeft, { flexDirection: row }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onOpenProfile}
            style={[styles.iconBtn, { backgroundColor: chipBg, borderColor: chipBorder }]}
          >
            <Ionicons name="person-outline" size={18} color={ink} />
          </TouchableOpacity>
          {/* Stories button - user can tap to open stories */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onOpenStories}
            style={styles.storiesBtn}
          >
            <LinearGradient
              colors={[colors.heroGradient[2], '#E84393', colors.heroGradient[0]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.storiesRing}
            >
              <View style={[styles.storiesInner, { backgroundColor: colors.heroGradientRich[1] }]}>
                <Ionicons name="sparkles" size={16} color={ink} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

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
                  {getCurrencySymbol(code) === code ? code : `${getCurrencySymbol(code)} ${code}`}
                </Text>
              </View>
            );
          })}
        </TouchableOpacity>

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

      {/* Balance - centered */}
      <View style={styles.balanceCenter}>
        <Text style={[styles.balanceSuperTitle, { color: ink, opacity: 0.7 }]}>
          {t('home.net_balance_month')}
        </Text>
        <Text
          style={[styles.balanceAmountText, { color: ink }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatCurrency(monthNetBalance, activeCurrency, { isRTL })}
        </Text>
        <Text style={[styles.altBalanceText, { color: ink, opacity: 0.65 }]}>
          ≈ {formatCurrency(altBalance, altCurrency, { isRTL })}
        </Text>
      </View>

      {/* Income / Expense flow pills */}
      <View style={[styles.flowRow, { flexDirection: row }]}>
        <View style={[styles.flowPill, { backgroundColor: chipBg, borderColor: chipBorder, flexDirection: row }]}>
          <View style={[styles.flowIconBadge, { backgroundColor: chipActiveBg, borderRadius: radius.sm }]}>
            <Ionicons name="arrow-up-outline" size={15} color={colors.income} />
          </View>
          <View style={styles.flowTextWrap}>
            <Text style={[styles.cashflowLabel, { color: ink, opacity: 0.7 }]}>{t('home.month_income')}</Text>
            <Text style={[styles.cashflowAmount, { color: ink }]}>
              +{formatCurrency(monthIncome, activeCurrency, { isRTL })}
            </Text>
          </View>
        </View>

        <View style={[styles.flowPill, { backgroundColor: chipBg, borderColor: chipBorder, flexDirection: row }]}>
          <View style={[styles.flowIconBadge, { backgroundColor: chipActiveBg, borderRadius: radius.sm }]}>
            <Ionicons name="arrow-down-outline" size={15} color={colors.expense} />
          </View>
          <View style={styles.flowTextWrap}>
            <Text style={[styles.cashflowLabel, { color: ink, opacity: 0.7 }]}>{t('home.monthly_expense')}</Text>
            <Text style={[styles.cashflowAmount, { color: ink }]}>
              -{formatCurrency(monthExpense, activeCurrency, { isRTL })}
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  topBarRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  heroLeft: {
    alignItems: 'center',
    gap: 8
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  storiesBtn: {
    width: 40,
    height: 40
  },
  storiesRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  storiesInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    alignItems: 'center',
    paddingVertical: 16
  },
  balanceSuperTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY_MEDIUM,
    marginBottom: 6
  },
  balanceAmountText: {
    fontSize: 44,
    fontFamily: FONT_FAMILY_BOLD,
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums']
  },
  altBalanceText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY_SEMIBOLD,
    marginTop: 6,
    fontVariant: ['tabular-nums']
  },
  flowRow: {
    gap: 10
  },
  flowPill: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10
  },
  flowIconBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  flowTextWrap: {
    flex: 1
  },
  cashflowLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY
  },
  cashflowAmount: {
    fontSize: 14.5,
    fontFamily: FONT_FAMILY_BOLD,
    marginTop: 1,
    fontVariant: ['tabular-nums']
  }
});
