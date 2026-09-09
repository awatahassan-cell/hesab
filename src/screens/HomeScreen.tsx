import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  StatusBar as RNStatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAppStore } from '../store/useAppStore';
import { formatCurrency, convertCurrency } from '../utils/currency';
import { formatLocalDate } from '../utils/dates';
import { TransactionItem } from '../components/transactions/TransactionItem';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UpcomingBillBanner } from '../components/common/UpcomingBillBanner';
import { DonutChart, DonutSlice } from '../components/charts/DonutChart';
import { HeroDonutCard } from '../components/home/HeroDonutCard';
import { FONT_FAMILY, FONT_FAMILY_MEDIUM, FONT_FAMILY_SEMIBOLD, FONT_FAMILY_BOLD } from '../theme/typography';
import { AuroraBackground } from '../components/common/AuroraBackground';
import { AppDialog } from '../components/common/AppDialog';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors, typography, radius } = useTheme();
  const { t, i18n } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);
  const displayCurrency = useAppStore((state) => state.displayCurrency);
  const toggleDisplayCurrency = useAppStore((state) => state.toggleDisplayCurrency);
  const marketRate100USD = useAppStore((state) => state.marketRate100USD);
  const setMarketRate100USD = useAppStore((state) => state.setMarketRate100USD);
  const exchangeRates = useAppStore((state) => state.exchangeRates);

  const {
    totalBalancePrimary,
    monthIncome,
    monthExpense,
    debtLentTotal,
    debtBorrowedTotal,
    recentTransactions,
    budgetProgressList,
    reminders,
    savingsGoals,
    categories,
    refreshAll
  } = useFinanceStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [tempRate, setTempRate] = useState(String(marketRate100USD || 150000));

  useEffect(() => {
    refreshAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const handleSaveRate = async () => {
    const rate = parseFloat(tempRate);
    if (!rate || rate <= 0) {
      AppDialog.alert(t('common.error'), t('home.enter_valid_rate'));
      return;
    }
    await setMarketRate100USD(rate);
    setShowRateModal(false);
    await refreshAll();
  };

  // Active currency conversion
  const activeCurrency = displayCurrency || 'IQD';
  const monthNetBalancePrimary = monthIncome - monthExpense;
  const displayMonthBalance = convertCurrency(
    monthNetBalancePrimary,
    primaryCurrency,
    activeCurrency,
    exchangeRates
  );
  const displayBalance = convertCurrency(
    totalBalancePrimary,
    primaryCurrency,
    activeCurrency,
    exchangeRates
  );
  const displayIncome = convertCurrency(
    monthIncome,
    primaryCurrency,
    activeCurrency,
    exchangeRates
  );
  const displayExpense = convertCurrency(
    monthExpense,
    primaryCurrency,
    activeCurrency,
    exchangeRates
  );

  const unpaidReminders = (reminders || []).filter((r) => !r.is_paid);

  // Compute category expense slices for Donut Chart
  const donutSlices: DonutSlice[] = useMemo(() => {
    const expenseTx = recentTransactions.filter((tx) => tx.type === 'expense');
    if (expenseTx.length === 0) return [];

    const catMap: Record<string, { name: string; color: string; amount: number }> = {};

    expenseTx.forEach((tx) => {
      const catId = tx.category_id || 'other';
      const cat = (categories || []).find((c) => c.id === catId);
      const name = tx.category_custom_name || (tx.category_name_key ? t(`categories.names.${tx.category_name_key}`, tx.category_name_key) : t('types.expense'));
      const color = tx.category_color || cat?.color || '#00A896';
      const amt = convertCurrency(tx.amount, tx.currency || primaryCurrency, activeCurrency, exchangeRates);

      if (!catMap[catId]) {
        catMap[catId] = { name, color, amount: 0 };
      }
      catMap[catId].amount += amt;
    });

    const totalExp = Object.values(catMap).reduce((sum, item) => sum + item.amount, 0);
    if (totalExp <= 0) return [];

    return Object.keys(catMap).map((catId) => {
      const item = catMap[catId];
      const pct = Math.round((item.amount / totalExp) * 100);
      return {
        id: catId,
        name: item.name,
        amount: Math.round(item.amount),
        percentage: pct,
        color: item.color
      };
    });
  }, [recentTransactions, categories, activeCurrency, primaryCurrency, exchangeRates]);

  // Top category budgets
  const insets = useSafeAreaInsets();
  const topSafeInset = Platform.OS === 'android'
    ? Math.max(RNStatusBar.currentHeight || 0, insets.top, 48) + 8
    : Math.max(insets.top, 20) + 4;
  const categoryBudgets = budgetProgressList.filter((b) => Boolean(b.budget.category_id));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: topSafeInset }]}>
      <AuroraBackground />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 4,
            paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 48) + 85 : Math.max(insets.bottom, 16) + 70
          }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Top Header: Date, Notification & Profile Avatar (Sekkeh Top Bar) */}
        <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Settings')}
            style={[styles.profileAvatar, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}
          >
            <Ionicons name="person" size={17} color={colors.accent} />
          </TouchableOpacity>

          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} style={{ marginHorizontal: 4 }} />
            <Text style={[styles.dateText, { color: colors.textPrimary }]}>
              {formatLocalDate(new Date(), i18n.language)}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('RemindersScreen')}
            style={[styles.notifBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}
          >
            <Ionicons name="notifications-outline" size={18} color={colors.textPrimary} />
            {unpaidReminders.length > 0 && (
              <View style={[styles.notifDot, { backgroundColor: colors.warning }]}>
                <Text style={styles.notifDotText}>{unpaidReminders.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Upcoming Bill / Installment Warning Banner (Sekkeh Top Alert) */}
        <UpcomingBillBanner
          reminders={reminders}
          onPress={() => navigation.navigate('RemindersScreen')}
        />

        {/* Royal Violet & Glowing Donut Hero Card */}
        <HeroDonutCard
          monthNetBalance={displayMonthBalance}
          monthIncome={displayIncome}
          monthExpense={displayExpense}
          activeCurrency={activeCurrency}
          primaryCurrency={primaryCurrency}
          exchangeRates={exchangeRates}
          marketRate100USD={marketRate100USD}
          isRTL={isRTL}
          onToggleCurrency={toggleDisplayCurrency}
          onOpenRateModal={() => setShowRateModal(true)}
        />

        {/* Royal Violet Quick Action 4-Grid */}
        <View style={[styles.quickActionGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Add', { type: 'income' })}
            style={[styles.actionTile, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
          >
            <View style={[styles.actionTileIconWrap, { backgroundColor: colors.incomeMuted }]}>
              <Ionicons name="add" size={22} color={colors.income} />
            </View>
            <Text numberOfLines={2} style={[styles.actionTileText, { color: colors.textPrimary }]}>{t('types.income')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Add', { type: 'expense' })}
            style={[styles.actionTile, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
          >
            <View style={[styles.actionTileIconWrap, { backgroundColor: colors.expenseMuted }]}>
              <Ionicons name="remove" size={22} color={colors.expense} />
            </View>
            <Text numberOfLines={2} style={[styles.actionTileText, { color: colors.textPrimary }]}>{t('types.expense')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('DebtsScreen')}
            style={[styles.actionTile, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
          >
            <View style={[styles.actionTileIconWrap, { backgroundColor: colors.accentMuted }]}>
              <Ionicons name="people-outline" size={20} color={colors.accent} />
            </View>
            <Text numberOfLines={2} style={[styles.actionTileText, { color: colors.textPrimary }]}>{t('debts.title')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('RemindersScreen')}
            style={[styles.actionTile, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
          >
            <View style={[styles.actionTileIconWrap, { backgroundColor: colors.warningMuted }]}>
              <Ionicons name="time-outline" size={20} color={colors.warning} />
            </View>
            <Text numberOfLines={2} style={[styles.actionTileText, { color: colors.textPrimary }]}>{t('home.instalments')}</Text>
          </TouchableOpacity>
        </View>

        {/* Sekkeh Donut Spending Breakdown Chart */}
        {donutSlices.length > 0 && (
          <DonutChart
            slices={donutSlices}
            totalAmount={displayExpense}
            currency={activeCurrency}
            title={t('home.spend_breakdown_monthly')}
            onSlicePress={() => navigation.navigate('Reports')}
          />
        )}

        {/* Feature Shortcut Pills (4 Grid Items) */}
        <View style={[styles.shortcutGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('RemindersScreen')}
            style={[styles.shortcutCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 10 }]}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#F59E0B18' }]}>
              <Ionicons name="time" size={18} color="#F59E0B" />
            </View>
            <Text numberOfLines={2} style={[styles.shortcutText, { color: colors.textPrimary }]}>
              {t('home.reminders')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('SavingsGoalsScreen')}
            style={[styles.shortcutCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 10 }]}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#3A86FF18' }]}>
              <Ionicons name="flag" size={18} color="#3A86FF" />
            </View>
            <Text numberOfLines={2} style={[styles.shortcutText, { color: colors.textPrimary }]}>
              {t('home.goal_fund')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('BudgetsScreen')}
            style={[styles.shortcutCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 10 }]}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#10B98118' }]}>
              <Ionicons name="pie-chart" size={18} color="#10B981" />
            </View>
            <Text numberOfLines={2} style={[styles.shortcutText, { color: colors.textPrimary }]}>
              {t('home.budgeting')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ShoppingScreen')}
            style={[styles.shortcutCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 10 }]}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#FB850018' }]}>
              <Ionicons name="cart" size={18} color="#FB8500" />
            </View>
            <Text numberOfLines={2} style={[styles.shortcutText, { color: colors.textPrimary }]}>
              {t('home.shopping_list')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Budget Status Section (Sekkeh Style: دۆخی بودجەکان) */}
        {categoryBudgets.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 12 }]}>
            <View style={[styles.sectionCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('home.budget_status')}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('BudgetsScreen')}>
                <Text style={[styles.seeAllText, { color: colors.accent }]}>
                  {t('home.budget_settings_link')}
                </Text>
              </TouchableOpacity>
            </View>

            {categoryBudgets.slice(0, 3).map((item) => {
              const catName = item.budget.category_custom_name ||
                (item.budget.category_name_key ? t(`categories.names.${item.budget.category_name_key}`) : t('common.category'));
              const pct = Math.min(100, item.percentage);
              const barColor = item.isOverBudget ? colors.danger : item.isWarning ? colors.warning : colors.income;

              return (
                <View key={item.budget.id} style={styles.budgetItemRow}>
                  <View style={[styles.budgetMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.budgetName, { color: colors.textPrimary }]}>{catName}</Text>
                    <Text style={[styles.budgetAmount, { color: barColor }]}>
                      {formatCurrency(item.spent, activeCurrency, { isRTL })} / {formatCurrency(item.budget.amount, activeCurrency, { isRTL })} ({item.percentage}%)
                    </Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSecondary }]}>
                    <View style={[styles.progressBar, { width: `${pct}%`, backgroundColor: barColor }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Debts Summary Banner if any */}
        {(debtLentTotal > 0 || debtBorrowedTotal > 0) && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('DebtsScreen')}
            style={[
              styles.debtCard,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.cardBorder,
                borderRadius: 10
              }
            ]}
          >
            <View style={[styles.debtRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.debtCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[typography.captionSmall, { color: colors.debtLent, fontWeight: '700' }]}>
                  {t('home.owed_to_me')}
                </Text>
                <Text style={[styles.debtAmount, { color: colors.textPrimary }]}>
                  {formatCurrency(debtLentTotal, activeCurrency, { isRTL })}
                </Text>
              </View>

              <View style={[styles.vDivider, { backgroundColor: colors.cardBorder }]} />

              <View style={[styles.debtCol, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
                <Text style={[typography.captionSmall, { color: colors.debtBorrowed, fontWeight: '700' }]}>
                  {t('home.i_owe')}
                </Text>
                <Text style={[styles.debtAmount, { color: colors.textPrimary }]}>
                  {formatCurrency(debtBorrowedTotal, activeCurrency, { isRTL })}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Recent Transactions Section */}
        <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('home.recent_transactions')}
          </Text>
          {recentTransactions.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={[styles.seeAllText, { color: colors.accent }]}>
                {t('home.see_all')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Transactions List or Sekkeh Friendly Empty State */}
        {recentTransactions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 14 }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.accentMuted }]}>
              <Ionicons name="sparkles" size={32} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {t('home.empty_title')}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              {t('home.empty_body')}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Add', { type: 'expense' })}
              style={[styles.emptyActionBtn, { backgroundColor: colors.accent, borderRadius: 8 }]}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyActionBtnText}>{t('home.record_first_expense')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentTransactions.slice(0, 5).map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} showDate={true} />
          ))
        )}
      </ScrollView>

      {/* Modal: Edit Market Exchange Rate */}
      <Modal visible={showRateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 14 }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('home.edit_market_rate')}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 14, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('home.rate_hint')}
            </Text>

            <View style={[styles.rateInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.rateLabel, { color: colors.textPrimary }]}>100$ =</Text>
              <TextInput
                placeholder="150000"
                placeholderTextColor={colors.textMuted}
                value={tempRate}
                onChangeText={setTempRate}
                keyboardType="numeric"
                style={[styles.modalInput, { flex: 1, backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, borderRadius: 8 }]}
                autoFocus
              />
              <Text style={[styles.rateLabel, { color: colors.textPrimary, marginHorizontal: 6 }]}>{t('currency.iqd_symbol')}</Text>
            </View>

            <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 18 }]}>
              <Button
                title={t('common.cancel')}
                onPress={() => setShowRateModal(false)}
                variant="secondary"
                style={{ flex: 1, borderRadius: 8 }}
              />
              <Button
                title={t('common.save')}
                onPress={handleSaveRate}
                variant="primary"
                style={{ flex: 1, borderRadius: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 60
  },
  topBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT_FAMILY_BOLD
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  notifDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3
  },
  notifDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: FONT_FAMILY_BOLD
  },
  heroCard: {
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12
  },
  heroHeader: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  heroBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  currencyTogglePill: {
    padding: 2,
    borderRadius: 6,
    borderWidth: 1
  },
  currencyToggleItem: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  currencyToggleText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONT_FAMILY_BOLD
  },
  heroBalanceText: {
    marginVertical: 6,
    fontSize: 32,
    fontWeight: '800',
    fontFamily: FONT_FAMILY_BOLD
  },
  marketRateChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 14
  },
  marketRateText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FONT_FAMILY_SEMIBOLD
  },
  cashflowRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cashflowCol: {
    flex: 1
  },
  flowBadge: {
    alignItems: 'center',
    marginBottom: 2
  },
  cashflowValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: FONT_FAMILY_BOLD
  },
  vDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 12
  },
  primaryActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12
  },
  bigActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2
  },
  bigActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginHorizontal: 6,
    fontFamily: FONT_FAMILY_BOLD
  },
  shortcutGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  shortcutCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5
  },
  shortcutIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: FONT_FAMILY_BOLD
  },
  sectionCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  sectionCardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONT_FAMILY_BOLD
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONT_FAMILY_SEMIBOLD
  },
  budgetItemRow: {
    marginVertical: 6
  },
  budgetMetaRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  budgetName: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT_FAMILY_SEMIBOLD
  },
  budgetAmount: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONT_FAMILY_BOLD
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBar: {
    height: 6,
    borderRadius: 3
  },
  debtCard: {
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5
  },
  debtRow: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  debtCol: {
    flex: 1
  },
  debtAmount: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: FONT_FAMILY_BOLD
  },
  sectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10
  },
  emptyCard: {
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: FONT_FAMILY_BOLD
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 12,
    fontFamily: FONT_FAMILY
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginHorizontal: 6,
    fontFamily: FONT_FAMILY_BOLD
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderWidth: 1
  },
  rateInputRow: {
    alignItems: 'center',
    marginVertical: 8
  },
  rateLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONT_FAMILY_BOLD
  },
  modalInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    fontSize: 15,
    marginHorizontal: 8,
    fontFamily: FONT_FAMILY_SEMIBOLD
  },
  modalActions: {
    gap: 10
  },
  quickActionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    gap: 8
  },
  actionTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  actionTileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  actionTileText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 11,
    fontWeight: '700'
  }
});
