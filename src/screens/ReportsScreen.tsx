import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar as RNStatusBar, Dimensions } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
import { AppDialog } from '../components/common/AppDialog';
import { MonthCalendar } from '../components/charts/MonthCalendar';
import { TrendChart } from '../components/charts/TrendChart';
import { fillMonths, recentMonthKeys, totalsByDay, totalsByMonth, PeriodTotal } from '../utils/aggregate';
import { formatLocalDate } from '../utils/dates';

interface ReportsScreenProps {
  navigation: any;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = () => {
  const { colors, typography, spacing, radius } = useTheme();
  const { t, i18n } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);
  const monthStartDay = useAppStore((state) => state.monthStartDay);

  const [period, setPeriod] = useState<DatePeriod>('month');
  const [totals, setTotals] = useState({ income: 0, expense: 0 });
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [topExpenses, setTopExpenses] = useState<Transaction[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'category' | 'top' | 'calendar' | 'trend'>('category');

  // Custom range. Kept beside `period` rather than replacing it, so switching
  // back to a preset does not lose the dates someone picked.
  const [customStart, setCustomStart] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  });
  const [customEnd, setCustomEnd] = useState<Date>(new Date());
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  const [dayTotals, setDayTotals] = useState<PeriodTotal[]>([]);
  const [monthTotals, setMonthTotals] = useState<PeriodTotal[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined);
  const [dayTransactions, setDayTransactions] = useState<Transaction[]>([]);

  /** The dates the whole screen reports on, preset or hand-picked. */
  const activeRange = useMemo(() => {
    if (period === 'custom') {
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      // Tolerate the dates being picked in either order.
      return start <= end ? { start, end } : { start: end, end: start };
    }
    return getPeriodRange(period, new Date(), monthStartDay);
  }, [period, customStart, customEnd, monthStartDay]);

  useEffect(() => {
    loadReportData();
  }, [activeRange.start.getTime(), activeRange.end.getTime()]);

  const loadReportData = async () => {
    const startIso = activeRange.start.toISOString();
    const endIso = activeRange.end.toISOString();

    // The trend charts look further back than the selected period on purpose:
    // twelve months of history is what makes a trend readable.
    const trendKeys = recentMonthKeys(12, activeRange.end);
    const trendStart = new Date(activeRange.end.getFullYear(), activeRange.end.getMonth() - 11, 1);

    const [periodTotals, catData, top10, rangeTx, trendTx] = await Promise.all([
      getTotalsForPeriod(startIso, endIso),
      getCategorySpendingForPeriod(startIso, endIso),
      getTopExpenses(10, startIso, endIso),
      getTransactions({ startDate: startIso, endDate: endIso }),
      getTransactions({ startDate: trendStart.toISOString(), endDate: endIso })
    ]);

    setTotals(periodTotals);
    setCategoriesData(catData);
    setTopExpenses(top10);
    setDayTotals(totalsByDay(rangeTx));
    setMonthTotals(fillMonths(totalsByMonth(trendTx), trendKeys));
    setSelectedDay(undefined);
  };

  // Loaded on demand: a month of taps should not mean a month of queries up
  // front, and only one day is ever on screen.
  useEffect(() => {
    if (!selectedDay) {
      setDayTransactions([]);
      return;
    }
    let cancelled = false;
    const [year, month, day] = selectedDay.split('-').map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);

    getTransactions({ startDate: start.toISOString(), endDate: end.toISOString() }).then((rows) => {
      if (!cancelled) setDayTransactions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedDay]);

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
      AppDialog.alert(t('common.error'), 'Could not generate PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      const periodTx = await getTransactions({
        startDate: activeRange.start.toISOString(),
        endDate: activeRange.end.toISOString()
      });
      if (!periodTx || periodTx.length === 0) {
        AppDialog.alert(t('common.info', t('common.info')), t('reports.nothing_in_range'));
        return;
      }
      await exportTransactionsToCSV(periodTx);
    } catch (e) {
      console.error('Export Excel error', e);
      AppDialog.alert(t('common.error'), 'Could not export Excel file');
    }
  };

  // The cards sit inside 16px screen padding and 14px card padding.
  const chartWidth = Dimensions.get('window').width - 32 - 28;

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
            { value: 'year', label: t('reports.period_year') },
            { value: 'custom', label: t('reports.period_custom') }
          ]}
          selected={period}
          onSelect={(p) => {
            setPeriod(p);
            setSelectedCatId(undefined);
          }}
        />

        {period === 'custom' && (
          <View style={[styles.rangeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {(['start', 'end'] as const).map((which) => (
              <TouchableOpacity
                key={which}
                activeOpacity={0.8}
                onPress={() => setPickerFor(which)}
                style={[
                  styles.rangeBtn,
                  { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.sm }
                ]}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <Text style={[typography.caption, { color: colors.textPrimary, marginHorizontal: 6 }]}>
                  {formatLocalDate(which === 'start' ? customStart : customEnd, i18n.language)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {pickerFor && (
          <DateTimePicker
            value={pickerFor === 'start' ? customStart : customEnd}
            mode="date"
            onChange={(event, date) => {
              setPickerFor(null);
              if (event.type === 'dismissed' || !date) return;
              if (pickerFor === 'start') setCustomStart(date);
              else setCustomEnd(date);
            }}
          />
        )}

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
                borderRadius: radius.md,
                flexDirection: isRTL ? 'row-reverse' : 'row'
              }
            ]}
          >
            <View style={[styles.exportIconBadge, { backgroundColor: colors.expenseMuted }]}>
              <Ionicons name="document-text-outline" size={16} color={colors.danger} />
            </View>
            <Text style={[styles.exportBtnText, { color: colors.textPrimary }]}>
              {t('menu.pdf_report')}
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
                borderRadius: radius.md,
                flexDirection: isRTL ? 'row-reverse' : 'row'
              }
            ]}
          >
            <View style={[styles.exportIconBadge, { backgroundColor: colors.incomeMuted }]}>
              <Ionicons name="stats-chart-outline" size={16} color={colors.income} />
            </View>
            <Text style={[styles.exportBtnText, { color: colors.textPrimary }]}>
              {t('menu.excel_file')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Report View Mode Tabs */}
        <View style={{ marginVertical: 8 }}>
          <SegmentedControl
            options={[
              { value: 'category', label: t('reports.category_breakdown') },
              { value: 'trend', label: t('reports.monthly_trends') },
              { value: 'calendar', label: t('reports.calendar_view') },
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

        {/* Income vs expense, and the running net, over twelve months */}
        {activeTab === 'trend' && (
          <View style={{ marginTop: 8 }}>
            <Card style={{ backgroundColor: colors.surface }}>
              <Text style={[typography.titleSmall, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('reports.monthly_trends')}
              </Text>
              <TrendChart totals={monthTotals} isRTL={isRTL} variant="bars" width={chartWidth} />
            </Card>

            <Card style={{ backgroundColor: colors.surface, marginTop: 10 }}>
              <Text style={[typography.titleSmall, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('reports.net_balance_trend')}
              </Text>
              <TrendChart totals={monthTotals} isRTL={isRTL} variant="line" width={chartWidth} />
            </Card>
          </View>
        )}

        {/* Calendar of the selected month */}
        {activeTab === 'calendar' && (
          <View style={{ marginTop: 8 }}>
            <Card style={{ backgroundColor: colors.surface }}>
              <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('reports.calendar_view')}
              </Text>
              <MonthCalendar
                month={activeRange.end}
                totals={dayTotals}
                isRTL={isRTL}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            </Card>

            {selectedDay && (
              <View style={{ marginTop: 10 }}>
                {dayTransactions.length === 0 ? (
                  <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', paddingVertical: 16 }]}>
                    {t('common.no_data')}
                  </Text>
                ) : (
                  dayTransactions.map((tx) => (
                    <TransactionItem key={tx.id} transaction={tx} showDate={false} />
                  ))
                )}
              </View>
            )}
          </View>
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
  rangeRow: {
    gap: 8,
    marginTop: 10
  },
  rangeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 10
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
