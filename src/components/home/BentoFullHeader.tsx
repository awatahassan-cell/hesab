import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
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
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();

  const altCurrency = activeCurrency === primaryCurrency ? referenceCurrency : primaryCurrency;
  const altBalance = convertCurrency(
    monthNetBalance,
    activeCurrency,
    altCurrency,
    exchangeRates
  );

  return (
    <LinearGradient
      colors={colors.heroGradient || ['#1E40AF', '#2563EB', '#06B6D4']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.3, y: 1 }}
      style={[styles.headerContainer, { paddingTop: topInset }]}
    >
      {/* Top Bar: Profile Avatar, Date/Period Badge, Notifications */}
      <View style={[styles.topBarRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onOpenProfile}
          style={styles.glassBtn}
        >
          <Ionicons name="person" size={16} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={[styles.periodPill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.periodTextMuted}>{t('reports.day', 'ڕۆژ')}</Text>
          <View style={styles.periodActivePill}>
            <Text style={styles.periodTextActive}>{t('reports.month', 'مانگ')}</Text>
          </View>
          <Text style={styles.periodTextMuted}>{t('reports.year', 'ساڵ')}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onOpenNotifications}
          style={styles.glassBtn}
        >
          <Ionicons name="notifications-outline" size={17} color="#FFFFFF" />
          {unpaidRemindersCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unpaidRemindersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Currency Switcher Pill & Date */}
      <View style={[styles.subRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={styles.dateLabel}>
          {formatLocalDate(new Date(), i18n.language)}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onToggleCurrency}
          style={[styles.currencyPill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          {[primaryCurrency, referenceCurrency].map((code) => (
            <View
              key={code}
              style={[styles.currencySegment, activeCurrency === code && styles.currencySegmentActive]}
            >
              <Text
                style={[
                  styles.currencyCodeText,
                  activeCurrency === code ? styles.currencyCodeActive : styles.currencyCodeMuted
                ]}
              >
                {getCurrencySymbol(code)} {code}
              </Text>
            </View>
          ))}
        </TouchableOpacity>
      </View>

      {/* Central Balance Display */}
      <View style={styles.balanceCenter}>
        <Text style={styles.balanceSuperTitle}>
          {t('home.net_balance_month', 'کۆی باڵانسی حیسابەکەت')}
        </Text>
        <Text style={styles.balanceAmountText} numberOfLines={1} adjustsFontSizeToFit>
          {formatCurrency(monthNetBalance, activeCurrency, { isRTL })}
        </Text>
        <Text style={styles.altBalanceText}>
          ≈ {formatCurrency(altBalance, altCurrency, { isRTL })}
        </Text>
      </View>

      {/* Glowing Spline Wave Curve */}
      <View style={styles.waveWrapper}>
        <Svg width="100%" height={56} viewBox="0 0 320 56" preserveAspectRatio="none">
          <Defs>
            <SvgGradient id="waveGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
            </SvgGradient>
          </Defs>
          {/* Subtle filled area beneath the wave */}
          <Path
            d="M0 45 Q 50 14, 100 32 T 200 18 T 260 8 T 320 25 L 320 56 L 0 56 Z"
            fill="url(#waveGlow)"
          />
          {/* Main luminous spline line */}
          <Path
            d="M0 45 Q 50 14, 100 32 T 200 18 T 260 8 T 320 25"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Glowing Peak Dot */}
          <Circle cx="260" cy="8" r="4.5" fill="#FFFFFF" />
          <Circle cx="260" cy="8" r="8" fill="#FFFFFF" fillOpacity="0.3" />
        </Svg>
      </View>

      {/* Cashflow Glass Bar (Income vs Expense) */}
      <View style={[styles.cashflowGlassBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.cashflowCol, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.flowIconBadge, { backgroundColor: 'rgba(52, 211, 153, 0.22)' }]}>
            <Ionicons name="arrow-down" size={13} color="#34D399" />
          </View>
          <View style={{ marginHorizontal: 6 }}>
            <Text style={styles.cashflowLabel}>{t('home.month_income', 'داهات')}</Text>
            <Text style={[styles.cashflowAmount, { color: '#34D399' }]}>
              +{formatCurrency(monthIncome, activeCurrency, { isRTL })}
            </Text>
          </View>
        </View>

        <View style={styles.glassDivider} />

        <View style={[styles.cashflowCol, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.flowIconBadge, { backgroundColor: 'rgba(251, 113, 133, 0.22)' }]}>
            <Ionicons name="arrow-up" size={13} color="#FB7185" />
          </View>
          <View style={{ marginHorizontal: 6 }}>
            <Text style={styles.cashflowLabel}>{t('home.monthly_expense', 'خەرجی')}</Text>
            <Text style={[styles.cashflowAmount, { color: '#FB7185' }]}>
              -{formatCurrency(monthExpense, activeCurrency, { isRTL })}
            </Text>
          </View>
        </View>
      </View>

      {/* Market Rate Glass Row */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onOpenRateModal}
        style={[styles.marketRateRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        <Ionicons name="swap-horizontal" size={13} color="rgba(255, 255, 255, 0.85)" />
        <Text style={styles.marketRateText}>
          {t('common.market_rate', 'نرخی بازاڕ')}: 100$ = {formatNumber(marketRate100USD || 0)}{' '}
          {getCurrencySymbol(primaryCurrency)}
        </Text>
        <Ionicons name="pencil" size={11} color="rgba(255, 255, 255, 0.65)" />
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingHorizontal: 16,
    paddingBottom: 22,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
    overflow: 'hidden'
  },
  topBarRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  glassBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#F59E0B',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: FONT_FAMILY_BOLD
  },
  periodPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderRadius: 18,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    gap: 4
  },
  periodTextMuted: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontFamily: FONT_FAMILY_MEDIUM,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  periodActivePill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2
  },
  periodTextActive: {
    color: '#1E40AF',
    fontSize: 11,
    fontFamily: FONT_FAMILY_BOLD
  },
  subRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  dateLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontFamily: FONT_FAMILY_MEDIUM
  },
  currencyPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderRadius: 12,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center'
  },
  currencySegment: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  currencySegmentActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)'
  },
  currencyCodeText: {
    fontSize: 10
  },
  currencyCodeActive: {
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY_BOLD
  },
  currencyCodeMuted: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: FONT_FAMILY
  },
  balanceCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 4
  },
  balanceSuperTitle: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 12,
    fontFamily: FONT_FAMILY_MEDIUM,
    marginBottom: 2
  },
  balanceAmountText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontFamily: FONT_FAMILY_BOLD,
    letterSpacing: -0.5
  },
  altBalanceText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontFamily: FONT_FAMILY_SEMIBOLD,
    marginTop: 2
  },
  waveWrapper: {
    height: 54,
    marginVertical: 4
  },
  cashflowGlassBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingVertical: 9,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 4
  },
  cashflowCol: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  flowIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cashflowLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
    fontFamily: FONT_FAMILY
  },
  cashflowAmount: {
    fontSize: 12,
    fontFamily: FONT_FAMILY_BOLD
  },
  glassDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  marketRateRow: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)'
  },
  marketRateText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
    fontFamily: FONT_FAMILY_MEDIUM
  }
});
