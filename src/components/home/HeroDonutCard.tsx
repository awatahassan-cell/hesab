import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { formatCurrency, convertCurrency } from '../../utils/currency';
import { FONT_FAMILY, FONT_FAMILY_BOLD, FONT_FAMILY_MEDIUM, FONT_FAMILY_SEMIBOLD } from '../../theme/typography';
import { useTranslation } from 'react-i18next';

interface HeroDonutCardProps {
  monthNetBalance: number;
  monthIncome: number;
  monthExpense: number;
  activeCurrency: string;
  primaryCurrency: string;
  exchangeRates: Record<string, number>;
  marketRate100USD: number;
  isRTL: boolean;
  onToggleCurrency: () => void;
  onOpenRateModal: () => void;
}

export const HeroDonutCard: React.FC<HeroDonutCardProps> = ({
  monthNetBalance,
  monthIncome,
  monthExpense,
  activeCurrency,
  primaryCurrency,
  exchangeRates,
  marketRate100USD,
  isRTL,
  onToggleCurrency,
  onOpenRateModal
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Alternative currency balance estimation
  const altCurrency = activeCurrency === 'IQD' ? 'USD' : 'IQD';
  const altBalance = convertCurrency(
    monthNetBalance,
    activeCurrency,
    altCurrency,
    exchangeRates
  );

  // SVG Donut Calculations
  const radius = 64;
  const strokeWidth = 11;
  const circumference = 2 * Math.PI * radius; // ~402.12

  const totalFlow = Math.max(monthIncome + monthExpense, 0);
  const incomeRatio = totalFlow > 0 ? Math.min(Math.max(monthIncome / totalFlow, 0.05), 0.95) : 0.7;
  const expenseRatio = totalFlow > 0 ? 1 - incomeRatio : 0.3;

  const incomeStroke = circumference * incomeRatio;
  const expenseStroke = circumference * expenseRatio;

  return (
    <LinearGradient
      colors={colors.heroGradient || ['#4338CA', '#6366F1', '#7C3AED']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardContainer}
    >
      {/* Top Card Row: Title & Currency Switcher Glass Pill */}
      <View style={[styles.topRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
          <View style={styles.headerIconBadge}>
            <Ionicons name="sparkles" size={14} color="#FDE047" />
          </View>
          <View style={{ marginHorizontal: 8 }}>
            <Text style={styles.cardSuperTitle}>{t('home.net_balance_month')}</Text>
            <Text style={styles.cardSubTitle}>{t('app.tagline_short')}</Text>
          </View>
        </View>

        {/* Currency Switcher Glass Toggle */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onToggleCurrency}
          style={styles.currencyPill}
        >
          <View style={[styles.currencyItem, activeCurrency === 'IQD' && styles.currencyItemActive]}>
            <Text style={[styles.currencyText, activeCurrency === 'IQD' && styles.currencyTextActive]}>
              {t('currency.iqd_symbol')}
            </Text>
          </View>
          <View style={[styles.currencyItem, activeCurrency === 'USD' && styles.currencyItemActive]}>
            <Text style={[styles.currencyText, activeCurrency === 'USD' && styles.currencyTextActive]}>
              $ USD
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Center 3D Glowing Donut Chart */}
      <View style={styles.donutCenterWrap}>
        <View style={styles.donutShadowBox}>
          <Svg width={164} height={164} viewBox="0 0 164 164">
            <G rotation="-90" origin="82, 82">
              {/* Background Track */}
              <Circle
                cx="82"
                cy="82"
                r={radius}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Income Arc (Cyan/Electric Emerald) */}
              <Circle
                cx="82"
                cy="82"
                r={radius}
                stroke="#38BDF8"
                strokeWidth={strokeWidth}
                strokeDasharray={`${incomeStroke} ${circumference}`}
                strokeLinecap="round"
                fill="transparent"
              />
              {/* Expense Arc (Neon Rose / Coral) */}
              <Circle
                cx="82"
                cy="82"
                r={radius}
                stroke="#FB7185"
                strokeWidth={strokeWidth}
                strokeDasharray={`${expenseStroke} ${circumference}`}
                strokeDashoffset={-incomeStroke}
                strokeLinecap="round"
                fill="transparent"
              />
            </G>
          </Svg>

          {/* Center Info inside Donut */}
          <View style={styles.donutInnerContent}>
            <Text style={styles.centerNetLabel}>{t('home.net_balance')}</Text>
            <Text
              style={styles.centerAmountText}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(monthNetBalance, activeCurrency, { isRTL })}
            </Text>
            <View style={styles.altCurrencyBadge}>
              <Text style={styles.altCurrencyText}>
                ≈ {formatCurrency(altBalance, altCurrency, { isRTL })}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Cashflow Split (Income vs Expense in Glass Bar) */}
      <View style={[styles.cashflowGlassBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.cashflowItem}>
          <View style={styles.flowLabelRow}>
            <View style={[styles.dotIndicator, { backgroundColor: '#34D399' }]} />
            <Text style={styles.flowLabel}>{t('home.month_income')}</Text>
          </View>
          <Text style={[styles.flowValue, { color: '#34D399' }]}>
            +{formatCurrency(monthIncome, activeCurrency, { isRTL })}
          </Text>
        </View>

        <View style={styles.verticalGlassDivider} />

        <View style={styles.cashflowItem}>
          <View style={styles.flowLabelRow}>
            <View style={[styles.dotIndicator, { backgroundColor: '#FB7185' }]} />
            <Text style={styles.flowLabel}>{t('home.monthly_expense')}</Text>
          </View>
          <Text style={[styles.flowValue, { color: '#FB7185' }]}>
            -{formatCurrency(monthExpense, activeCurrency, { isRTL })}
          </Text>
        </View>
      </View>

      {/* Market Rate Bottom Pill */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onOpenRateModal}
        style={[styles.marketRatePill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        <Ionicons name="swap-horizontal" size={13} color="rgba(255, 255, 255, 0.85)" />
        <Text style={styles.marketRateText}>
          {t('common.market_rate')}: 100$ ={' '}
          {Number(marketRate100USD || 150000).toLocaleString()} {t('currency.iqd_symbol')}
        </Text>
        <Ionicons name="pencil" size={11} color="rgba(255, 255, 255, 0.6)" />
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 26,
    padding: 18,
    marginVertical: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden'
  },
  topRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  headerIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardSuperTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)'
  },
  cardSubTitle: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 13,
    color: '#FFFFFF'
  },
  currencyPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)'
  },
  currencyItem: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10
  },
  currencyItemActive: {
    backgroundColor: '#FFFFFF'
  },
  currencyText: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)'
  },
  currencyTextActive: {
    color: '#4F46E5',
    fontWeight: '700'
  },
  donutCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10
  },
  donutShadowBox: {
    position: 'relative',
    width: 164,
    height: 164,
    alignItems: 'center',
    justifyContent: 'center'
  },
  donutInnerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120
  },
  centerNetLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 2
  },
  centerAmountText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center'
  },
  altCurrencyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
    marginTop: 4
  },
  altCurrencyText: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 10,
    color: '#FFFFFF'
  },
  cashflowGlassBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  cashflowItem: {
    flex: 1,
    alignItems: 'center'
  },
  flowLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4
  },
  flowLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)'
  },
  flowValue: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 13,
    fontWeight: '700'
  },
  verticalGlassDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)'
  },
  marketRatePill: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  marketRateText: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 6
  }
});
