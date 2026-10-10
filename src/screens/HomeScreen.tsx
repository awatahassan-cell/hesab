import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAppStore } from '../store/useAppStore';
import { formatCurrency, convertCurrency, getCurrencySymbol, per100Usd } from '../utils/currency';
import { TransactionItem } from '../components/transactions/TransactionItem';
import { Button } from '../components/common/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UpcomingBillBanner } from '../components/common/UpcomingBillBanner';
import { DonutSlice } from '../components/charts/DonutChart';
import { CategoryBarChart } from '../components/charts/CategoryBarChart';
import { BentoFullHeader } from '../components/home/BentoFullHeader';
import { PastelBentoCards } from '../components/home/PastelBentoCards';
import { SmartInsightCard } from '../components/home/SmartInsightCard';
import { MultiWalletCards } from '../components/home/MultiWalletCards';
import { InsightStories } from '../components/home/InsightStories';
import { buildStories } from '../utils/stories';
import { elevation } from '../theme/spacing';
import { FONT_FAMILY, FONT_FAMILY_BOLD, FONT_FAMILY_SEMIBOLD } from '../theme/typography';
import { AppDialog } from '../components/common/AppDialog';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors, typography, radius } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);
  const displayCurrency = useAppStore((state) => state.displayCurrency);
  const referenceCurrency = useAppStore((state) => state.referenceCurrency);
  const toggleDisplayCurrency = useAppStore((state) => state.toggleDisplayCurrency);
  const marketRate100USD = useAppStore((state) => state.marketRate100USD);
  const setMarketRate100USD = useAppStore((state) => state.setMarketRate100USD);
  const exchangeRates = useAppStore((state) => state.exchangeRates);

  const {
    accounts,
    totalBalancePrimary,
    monthIncome,
    monthExpense,
    debtLentTotal,
    debtBorrowedTotal,
    recentTransactions,
    transactions,
    budgetProgressList,
    reminders,
    savingsGoals,
    categories,
    refreshAll
  } = useFinanceStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showStoriesModal, setShowStoriesModal] = useState(false);
  const [tempRate, setTempRate] = useState(String(marketRate100USD || ''));
  const [scrollY, setScrollY] = useState(0);

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
  const activeCurrency = displayCurrency || primaryCurrency;
  const monthNetBalancePrimary = monthIncome - monthExpense;
  const displayMonthBalance = convertCurrency(
    monthNetBalancePrimary,
    primaryCurrency,
    activeCurrency,
    exchangeRates
  );
  const displayIncome = convertCurrency(monthIncome, primaryCurrency, activeCurrency, exchangeRates);
  const displayExpense = convertCurrency(monthExpense, primaryCurrency, activeCurrency, exchangeRates);

  const unpaidReminders = (reminders || []).filter((r) => !r.is_paid);

  // Compute category expense slices for the category cards and bar chart
  const donutSlices: DonutSlice[] = useMemo(() => {
    const expenseTx = recentTransactions.filter((tx) => tx.type === 'expense');
    if (expenseTx.length === 0) return [];

    const catMap: Record<string, { name: string; color: string; icon?: string; amount: number }> = {};

    expenseTx.forEach((tx) => {
      const catId = tx.category_id || 'other';
      const cat = (categories || []).find((c) => c.id === catId);
      const name = tx.category_custom_name || (tx.category_name_key ? t(`categories.names.${tx.category_name_key}`, tx.category_name_key) : t('types.expense'));
      const color = tx.category_color || cat?.color || colors.accent;
      const icon = tx.category_icon || cat?.icon;
      const amt = convertCurrency(tx.amount, tx.currency || primaryCurrency, activeCurrency, exchangeRates);

      if (!catMap[catId]) {
        catMap[catId] = { name, color, icon, amount: 0 };
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
        color: item.color,
        icon: item.icon
      };
    });
  }, [recentTransactions, categories, activeCurrency, primaryCurrency, exchangeRates, colors.accent, t]);

  const stories = useMemo(
    () =>
      buildStories({
        transactions,
        reminders,
        savingsGoals,
        now: new Date(),
        convert: (amount, currency) =>
          convertCurrency(amount, currency || primaryCurrency, activeCurrency, exchangeRates),
        // The store loads the latest 200 — at that size older days may be cut off.
        truncated: transactions.length >= 200
      }),
    [transactions, reminders, savingsGoals, primaryCurrency, activeCurrency, exchangeRates]
  );

  const insets = useSafeAreaInsets();
  const topSafeInset = Platform.OS === 'android'
    ? Math.max(RNStatusBar.currentHeight || 0, insets.top, 48) + 8
    : Math.max(insets.top, 20) + 4;
  const categoryBudgets = budgetProgressList.filter((b) => Boolean(b.budget.category_id));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <RNStatusBar barStyle={colors.heroIsDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Pinned top bar that stays when user scrolls */}
      {scrollY > 80 && (
        <LinearGradient
          colors={colors.heroGradientRich}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.65, y: 1 }}
          style={[
            styles.pinnedBar,
            {
              paddingTop: topSafeInset,
              borderBottomLeftRadius: 22,
              borderBottomRightRadius: 22
            }
          ]}
        >
          <View style={[styles.pinnedBarRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Title / Balance on the start side (Right in RTL, Left in LTR) */}
            <View style={[styles.pinnedTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 7 }}>
                <Image
                  source={require('../../assets/icon.png')}
                  style={{ width: 22, height: 22, borderRadius: 6 }}
                />
                <Text numberOfLines={1} style={styles.pinnedAppTitle}>
                  {t('app_name', 'دینارۆ')}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.pinnedBalanceText}>
                {t('home.net_balance_month')}: {formatCurrency(displayMonthBalance, activeCurrency, { isRTL })}
              </Text>
            </View>

            {/* Quick Actions on the opposite side */}
            <View style={[styles.pinnedActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={toggleDisplayCurrency}
                style={styles.pinnedChipBtn}
              >
                <Text style={styles.pinnedChipText}>
                  {activeCurrency}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => navigation.navigate('RemindersScreen')}
                style={styles.pinnedIconBtn}
              >
                <Ionicons name="notifications-outline" size={17} color="#FFFFFF" />
                {unpaidReminders.length > 0 && (
                  <View style={[styles.pinnedBadge, { backgroundColor: colors.warning }]}>
                    <Text style={styles.pinnedBadgeText}>{unpaidReminders.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => navigation.navigate('Settings')}
                style={styles.pinnedIconBtn}
              >
                <Ionicons name="person-outline" size={17} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 48) + 85 : Math.max(insets.bottom, 16) + 70
          }
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Quiet header: balance first, everything else at a lower register */}
        <BentoFullHeader
          topInset={topSafeInset}
          monthNetBalance={displayMonthBalance}
          monthIncome={displayIncome}
          monthExpense={displayExpense}
          activeCurrency={activeCurrency}
          primaryCurrency={primaryCurrency}
          referenceCurrency={referenceCurrency}
          exchangeRates={exchangeRates}
          marketRate100USD={marketRate100USD}
          isRTL={isRTL}
          unpaidRemindersCount={unpaidReminders.length}
          onToggleCurrency={toggleDisplayCurrency}
          onOpenRateModal={() => {
            setTempRate(String(marketRate100USD || per100Usd(primaryCurrency, exchangeRates)));
            setShowRateModal(true);
          }}
          onOpenProfile={() => navigation.navigate('Settings')}
          onOpenNotifications={() => navigation.navigate('RemindersScreen')}
          onOpenStories={() => setShowStoriesModal(true)}
        />

        {/* Two big action buttons — the key interaction */}
        <View style={[styles.actionDuo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Add', { type: 'expense' })}
            style={[styles.actionBig, { backgroundColor: colors.expenseMuted, borderRadius: radius.lg }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.expense }]}>
              <Ionicons name="remove" size={22} color="#FFFFFF" />
            </View>
            <Text style={[styles.actionText, { color: colors.expense }]}>{t('types.expense')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Add', { type: 'income' })}
            style={[styles.actionBig, { backgroundColor: colors.incomeMuted, borderRadius: radius.lg }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.income }]}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </View>
            <Text style={[styles.actionText, { color: colors.income }]}>{t('types.income')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bodyWrapper}>
          {/* Upcoming bill / instalment warning */}
          <UpcomingBillBanner
            reminders={reminders}
            onPress={() => navigation.navigate('RemindersScreen')}
          />

          {/* Smart financial insight */}
          <SmartInsightCard
            monthIncome={displayIncome}
            monthExpense={displayExpense}
            currency={activeCurrency}
            isRTL={isRTL}
            onPressDetails={() => navigation.navigate('BudgetsScreen')}
          />

          {/* Wallet carousel */}
          {accounts && accounts.length > 0 && (
            <MultiWalletCards
              accounts={accounts}
              currency={activeCurrency}
              isRTL={isRTL}
              onPressAccount={() => navigation.navigate('AccountsScreen')}
              onAddAccount={() => navigation.navigate('AccountsScreen')}
            />
          )}

          {/* Quick action grid */}
          <View style={[styles.quickActionGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Add', { type: 'income' })}
              style={[
                styles.actionTile,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg },
                elevation.sm(colors.shadowColor)
              ]}
            >
              <View style={[styles.actionTileIconWrap, { backgroundColor: colors.incomeMuted }]}>
                <Ionicons name="add" size={22} color={colors.income} />
              </View>
              <Text numberOfLines={2} style={[styles.actionTileText, { color: colors.textPrimary }]}>{t('types.income')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Add', { type: 'expense' })}
              style={[
                styles.actionTile,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg },
                elevation.sm(colors.shadowColor)
              ]}
            >
              <View style={[styles.actionTileIconWrap, { backgroundColor: colors.expenseMuted }]}>
                <Ionicons name="remove" size={22} color={colors.expense} />
              </View>
              <Text numberOfLines={2} style={[styles.actionTileText, { color: colors.textPrimary }]}>{t('types.expense')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('DebtsScreen')}
              style={[
                styles.actionTile,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg },
                elevation.sm(colors.shadowColor)
              ]}
            >
              <View style={[styles.actionTileIconWrap, { backgroundColor: colors.accentMuted }]}>
                <Ionicons name="people-outline" size={20} color={colors.accent} />
              </View>
              <Text numberOfLines={2} style={[styles.actionTileText, { color: colors.textPrimary }]}>{t('debts.title')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('RemindersScreen')}
              style={[
                styles.actionTile,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg },
                elevation.sm(colors.shadowColor)
              ]}
            >
              <View style={[styles.actionTileIconWrap, { backgroundColor: colors.warningMuted }]}>
                <Ionicons name="calendar-outline" size={20} color={colors.warning} />
              </View>
              <Text numberOfLines={2} style={[styles.actionTileText, { color: colors.textPrimary }]}>{t('home.instalments')}</Text>
            </TouchableOpacity>
          </View>

          {/* Category glance cards */}
          {donutSlices.length > 0 && (
            <PastelBentoCards
              slices={donutSlices}
              currency={activeCurrency}
              isRTL={isRTL}
              onSeeAll={() => navigation.navigate('BudgetsScreen')}
              onSelectCategory={() => navigation.navigate('BudgetsScreen')}
            />
          )}

          {/* Category expense breakdown */}
          {donutSlices.length > 0 && (
            <CategoryBarChart
              slices={donutSlices}
              totalAmount={displayExpense}
              currency={activeCurrency}
              onPress={() => navigation.navigate('Reports')}
              isRTL={isRTL}
            />
          )}

          {/* Feature shortcuts: Budgets, Goals, Shopping, Accounts — each on its
              scheme tile, so single-accent schemes stay one quiet colour and
              the multi-colour schemes give every shortcut its own tone. */}
          <View style={[styles.shortcutGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('BudgetsScreen')}
              style={[
                styles.shortcutCard,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg },
                elevation.sm(colors.shadowColor)
              ]}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: colors.tiles[0].bg }]}>
                <Ionicons name="pie-chart-outline" size={18} color={colors.tiles[0].fg} />
              </View>
              <Text numberOfLines={2} style={[styles.shortcutText, { color: colors.textPrimary }]}>
                {t('home.budgeting')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('SavingsGoalsScreen')}
              style={[
                styles.shortcutCard,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg },
                elevation.sm(colors.shadowColor)
              ]}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: colors.tiles[1].bg }]}>
                <Ionicons name="flag-outline" size={18} color={colors.tiles[1].fg} />
              </View>
              <Text numberOfLines={2} style={[styles.shortcutText, { color: colors.textPrimary }]}>
                {t('home.goal_fund')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ShoppingScreen')}
              style={[
                styles.shortcutCard,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg },
                elevation.sm(colors.shadowColor)
              ]}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: colors.tiles[2].bg }]}>
                <Ionicons name="bag-handle-outline" size={18} color={colors.tiles[2].fg} />
              </View>
              <Text numberOfLines={2} style={[styles.shortcutText, { color: colors.textPrimary }]}>
                {t('home.shopping_list')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('AccountsScreen')}
              style={[
                styles.shortcutCard,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg },
                elevation.sm(colors.shadowColor)
              ]}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: colors.tiles[3].bg }]}>
                <Ionicons name="wallet-outline" size={18} color={colors.tiles[3].fg} />
              </View>
              <Text numberOfLines={2} style={[styles.shortcutText, { color: colors.textPrimary }]}>
                {t('accounts.title')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Budget status */}
          {categoryBudgets.length > 0 && (
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg },
                elevation.sm(colors.shadowColor)
              ]}
            >
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

          {/* Debts summary */}
          {(debtLentTotal > 0 || debtBorrowedTotal > 0) && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('DebtsScreen')}
              style={[
                styles.debtCard,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, borderRadius: radius.lg }
              ]}
            >
              <View style={[styles.debtRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.debtCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[typography.captionSmall, { color: colors.debtLent }]}>
                    {t('home.owed_to_me')}
                  </Text>
                  <Text style={[styles.debtAmount, { color: colors.textPrimary }]}>
                    {formatCurrency(debtLentTotal, activeCurrency, { isRTL })}
                  </Text>
                </View>

                <View style={[styles.vDivider, { backgroundColor: colors.cardBorder }]} />

                <View style={[styles.debtCol, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
                  <Text style={[typography.captionSmall, { color: colors.debtBorrowed }]}>
                    {t('home.i_owe')}
                  </Text>
                  <Text style={[styles.debtAmount, { color: colors.textPrimary }]}>
                    {formatCurrency(debtBorrowedTotal, activeCurrency, { isRTL })}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Recent transactions */}
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

          {recentTransactions.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg }
              ]}
            >
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
                style={[styles.emptyActionBtn, { backgroundColor: colors.accent, borderRadius: radius.md }]}
              >
                <Ionicons name="add" size={18} color={colors.textInverse} />
                <Text style={[styles.emptyActionBtnText, { color: colors.textInverse }]}>{t('home.record_first_expense')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentTransactions.slice(0, 5).map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} showDate={true} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal: Edit Market Exchange Rate */}
      <Modal visible={showRateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('home.edit_market_rate')}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 14, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('home.rate_hint')}
            </Text>

            <View style={[styles.rateInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.rateLabel, { color: colors.textPrimary }]}>100$ =</Text>
              <TextInput
                placeholder={String(per100Usd(primaryCurrency, exchangeRates))}
                placeholderTextColor={colors.textMuted}
                value={tempRate}
                onChangeText={setTempRate}
                keyboardType="numeric"
                style={[
                  styles.modalInput,
                  { flex: 1, backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, borderRadius: radius.md }
                ]}
                autoFocus
              />
              <Text style={[styles.rateLabel, { color: colors.textPrimary, marginHorizontal: 6 }]}>{getCurrencySymbol(primaryCurrency)}</Text>
            </View>

            <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 18 }]}>
              <Button
                title={t('common.cancel')}
                onPress={() => setShowRateModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title={t('common.save')}
                onPress={handleSaveRate}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Insight Stories (Instagram style full screen) */}
      <Modal
        visible={showStoriesModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowStoriesModal(false)}
      >
        <View style={styles.storiesModalFullScreen}>
          {stories.length > 0 ? (
            <InsightStories
              stories={stories}
              currency={activeCurrency}
              isRTL={isRTL}
              fullScreen
              onClose={() => setShowStoriesModal(false)}
            />
          ) : (
            <View style={styles.storiesEmptyWrap}>
              <TouchableOpacity
                style={styles.storiesCloseBtnFloating}
                onPress={() => setShowStoriesModal(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={[styles.storiesEmptyCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                <Ionicons name="sparkles-outline" size={42} color={colors.accent} />
                <Text style={[styles.storiesEmptyTitle, { color: colors.textPrimary }]}>
                  {t('home.empty_title')}
                </Text>
                <Text style={[styles.storiesEmptyDesc, { color: colors.textMuted }]}>
                  {t('home.empty_body')}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  storiesModalFullScreen: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 6,
    paddingTop: Platform.OS === 'android' ? 12 : 24,
    paddingBottom: Platform.OS === 'android' ? 16 : 24
  },
  storiesEmptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16
  },
  storiesCloseBtnFloating: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  storiesEmptyCard: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  storiesEmptyTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY_BOLD
  },
  storiesEmptyDesc: {
    fontSize: 13,
    fontFamily: FONT_FAMILY,
    textAlign: 'center',
    lineHeight: 20
  },
  actionDuo: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6
  },
  actionBig: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 16
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY_BOLD,
    fontWeight: '700'
  },
  screen: {
    flex: 1
  },
  content: {
    paddingBottom: 60
  },
  bodyWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8
  },
  sectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY_BOLD
  },
  seeAllText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY_SEMIBOLD
  },
  quickActionGrid: {
    justifyContent: 'space-between',
    marginVertical: 10,
    gap: 8
  },
  actionTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1
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
    fontSize: 11
  },
  shortcutGrid: {
    gap: 8,
    marginBottom: 12
  },
  shortcutCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  shortcutIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  shortcutText: {
    fontSize: 11,
    textAlign: 'center',
    fontFamily: FONT_FAMILY_BOLD
  },
  sectionCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12
  },
  sectionCardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  budgetItemRow: {
    marginVertical: 6
  },
  budgetMetaRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  budgetName: {
    fontSize: 12,
    fontFamily: FONT_FAMILY_SEMIBOLD
  },
  budgetAmount: {
    fontSize: 11,
    fontFamily: FONT_FAMILY_BOLD,
    fontVariant: ['tabular-nums']
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
    padding: 14,
    borderWidth: 1,
    marginBottom: 12
  },
  debtRow: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  debtCol: {
    flex: 1
  },
  debtAmount: {
    fontSize: 14,
    marginTop: 3,
    fontFamily: FONT_FAMILY_BOLD,
    fontVariant: ['tabular-nums']
  },
  vDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 14
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
    paddingVertical: 11,
    gap: 6
  },
  emptyActionBtnText: {
    fontSize: 13,
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
    alignSelf: 'stretch',
    marginVertical: 8
  },
  rateLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY_BOLD,
    flexShrink: 0
  },
  modalInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    fontSize: 15,
    marginHorizontal: 8,
    // Keeps a flexed input from setting the row's minimum width and pushing
    // the currency symbol beside it off the screen.
    minWidth: 0,
    fontFamily: FONT_FAMILY_SEMIBOLD
  },
  modalActions: {
    gap: 10
  },
  pinnedBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 20,
    paddingBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8
  },
  pinnedBarRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42
  },
  pinnedTitleWrap: {
    flex: 1,
    justifyContent: 'center'
  },
  pinnedAppTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONT_FAMILY_BOLD,
    letterSpacing: 0
  },
  pinnedBalanceText: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 12,
    fontFamily: FONT_FAMILY_SEMIBOLD,
    marginTop: 2,
    fontVariant: ['tabular-nums']
  },
  pinnedActionsRow: {
    alignItems: 'center',
    gap: 8
  },
  pinnedChipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pinnedChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FONT_FAMILY_BOLD
  },
  pinnedIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pinnedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3
  },
  pinnedBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontFamily: FONT_FAMILY_BOLD
  }
});
