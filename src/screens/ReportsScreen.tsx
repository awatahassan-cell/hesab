import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, StatusBar as RNStatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { getPeriodRange, DatePeriod } from '../utils/dates';
import { getTotalsForPeriod, getCategorySpendingForPeriod, getTopExpenses, getTransactions } from '../db/queries/transactions';
import { formatCurrency } from '../utils/currency';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { Card } from '../components/common/Card';
import { TransactionItem } from '../components/transactions/TransactionItem';
import { generatePDFReport, exportTransactionsToCSV } from '../utils/export';
import { Transaction } from '../db/schema';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuroraBackground } from '../components/common/AuroraBackground';

interface ReportsScreenProps {
  navigation: any;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = () => {
  const { colors, typography, spacing, radius } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);
  const monthStartDay = useAppStore((state) => state.monthStartDay);

  const [period, setPeriod] = useState<DatePeriod>('month');
  const [totals, setTotals] = useState({ income: 0, expense: 0 });
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [topExpenses, setTopExpenses] = useState<Transaction[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'category' | 'top' | 'comparison'>('category');

  useEffect(() => {
    loadReportData();
  }, [period, monthStartDay]);

  const loadReportData = async () => {
    const { start, end } = getPeriodRange(period, new Date(), monthStartDay);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const [periodTotals, catData, top10] = await Promise.all([
      getTotalsForPeriod(startIso, endIso),
      getCategorySpendingForPeriod(startIso, endIso),
      getTopExpenses(10, startIso, endIso)
    ]);

    setTotals(periodTotals);
    setCategoriesData(catData);
    setTopExpenses(top10);
  };

  const handleExportPDF = async () => {
    try {
      await generatePDFReport({
        periodLabel: t(`reports.period_${period}`),
        totalIncome: totals.income,
        totalExpense: totals.expense,
        currency: primaryCurrency,
        transactions: topExpenses,
        categoryBreakdown: categoriesData.map((c) => ({
          name: c.category_custom_name || t(`categories.names.${c.category_name_key}`, c.category_name_key),
          amount: c.total_amount,
          percentage: c.percentage
        })),
        isRTL
      });
    } catch (e) {
      Alert.alert(t('common.error'), 'Could not generate PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      const { start, end } = getPeriodRange(period, new Date(), monthStartDay);
      const periodTx = await getTransactions({
        startDate: start.toISOString(),
        endDate: end.toISOString()
      });
      if (!periodTx || periodTx.length === 0) {
        Alert.alert(t('common.info', 'زانیاری'), 'هیچ مامەڵەیەک نییە بۆ هەناردەکردن لەم ماوەیەدا');
        return;
      }
      await exportTransactionsToCSV(periodTx);
    } catch (e) {
      console.error('Export Excel error', e);
      Alert.alert(t('common.error'), 'Could not export Excel file');
    }
  };

  const insets = useSafeAreaInsets();
  const topSafeInset = Platform.OS === 'android'
    ? Math.max(RNStatusBar.currentHeight || 0, insets.top, 48) + 8
    : Math.max(insets.top, 20) + 4;
  const bottomSafePadding = Platform.OS === 'android'
    ? Math.max(insets.bottom, 48) + 85
    : Math.max(insets.bottom, 16) + 70;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: topSafeInset }]}>
      <AuroraBackground />
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: 4,
          paddingBottom: bottomSafePadding
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
        <SegmentedControl
          options={[
            { value: 'day', label: t('reports.period_day') },
            { value: 'week', label: t('reports.period_week') },
            { value: 'month', label: t('reports.period_month') },
            { value: 'year', label: t('reports.period_year') }
          ]}
          selected={period}
          onSelect={(p) => {
            setPeriod(p);
            setSelectedCatId(undefined);
          }}
        />

        {/* Summary Card */}
        <Card style={{ marginVertical: 12, backgroundColor: colors.surface }}>
          <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.summaryCol}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t('home.monthly_income')}</Text>
              <Text style={[typography.tabularNumber, { color: colors.income, marginTop: 4 }]}>
                +{formatCurrency(totals.income, primaryCurrency, { isRTL })}
              </Text>
            </View>

            <View style={[styles.vDivider, { backgroundColor: colors.divider }]} />

            <View style={styles.summaryCol}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t('home.monthly_expense')}</Text>
              <Text style={[typography.tabularNumber, { color: colors.expense, marginTop: 4 }]}>
                -{formatCurrency(totals.expense, primaryCurrency, { isRTL })}
              </Text>
            </View>

            <View style={[styles.vDivider, { backgroundColor: colors.divider }]} />

            <View style={styles.summaryCol}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t('home.net_savings')}</Text>
              <Text style={[typography.tabularNumber, { color: colors.textPrimary, marginTop: 4 }]}>
                {formatCurrency(totals.income - totals.expense, primaryCurrency, { isRTL })}
              </Text>
            </View>
          </View>
        </Card>

        {/* Modern Export Action Bar (PDF & Excel) */}
        <View style={[styles.exportActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleExportPDF}
            style={[
              styles.exportBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
                borderRadius: 8,
                flexDirection: isRTL ? 'row-reverse' : 'row'
              }
            ]}
          >
            <View style={[styles.exportIconBadge, { backgroundColor: '#EF444415' }]}>
              <Ionicons name="document-text" size={16} color="#EF4444" />
            </View>
            <Text style={[styles.exportBtnText, { color: colors.textPrimary }]}>
              ڕاپۆرتی PDF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleExportExcel}
            style={[
              styles.exportBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
                borderRadius: 8,
                flexDirection: isRTL ? 'row-reverse' : 'row'
              }
            ]}
          >
            <View style={[styles.exportIconBadge, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="stats-chart" size={16} color="#10B981" />
            </View>
            <Text style={[styles.exportBtnText, { color: colors.textPrimary }]}>
              فایلی Excel / CSV
            </Text>
          </TouchableOpacity>
        </View>

        {/* Report View Mode Tabs */}
        <View style={{ marginVertical: 8 }}>
          <SegmentedControl
            options={[
              { value: 'category', label: t('reports.category_breakdown') },
              { value: 'top', label: t('reports.top_expenses') }
            ]}
            selected={activeTab}
            onSelect={(v: any) => setActiveTab(v)}
          />
        </View>

        {/* Category Breakdown */}
        {activeTab === 'category' && (
          <Card style={{ marginTop: 8, backgroundColor: colors.surface }}>
            <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[typography.titleSmall, { color: colors.textPrimary }]}>
                {t('reports.category_breakdown')}
              </Text>
              <TouchableOpacity onPress={handleExportPDF} style={styles.pdfBtn}>
                <Ionicons name="document-text-outline" size={20} color={colors.accent} />
              </TouchableOpacity>
            </View>

            <CategoryPieChart
              data={categoriesData}
              currency={primaryCurrency}
              selectedCategoryId={selectedCatId}
              onSelectCategory={(cid) => setSelectedCatId(selectedCatId === cid ? undefined : cid)}
            />
          </Card>
        )}

        {/* Top 10 Largest Expenses */}
        {activeTab === 'top' && (
          <View style={{ marginTop: 8 }}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginVertical: 8, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('reports.top_expenses')}
            </Text>
            {topExpenses.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} showDate={true} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  summaryRow: {
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center'
  },
  vDivider: {
    width: 1,
    height: 36
  },
  exportActionsRow: {
    gap: 10,
    marginTop: 4,
    marginBottom: 8
  },
  exportBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1
  },
  exportIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '700'
  },
  sectionTitleRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  pdfBtn: {
    padding: 4
  }
});
