import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { getTransactions } from '../db/queries/transactions';
import { exportTransactionsToCSV, generatePDFReport } from '../utils/export';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuroraBackground } from '../components/common/AuroraBackground';
import { AppDialog } from '../components/common/AppDialog';

interface MenuScreenProps {
  navigation: any;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({ navigation }) => {
  const { colors, typography, radius } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);
  const { recentTransactions, totalBalancePrimary, monthIncome, monthExpense } = useFinanceStore();

  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const allTx = await getTransactions({ limit: 100 });
      await generatePDFReport({
        periodLabel: t('menu.general_report'),
        totalIncome: monthIncome,
        totalExpense: monthExpense,
        currency: primaryCurrency,
        transactions: allTx,
        categoryBreakdown: [],
        isRTL
      });
      setExporting(false);
    } catch (e) {
      setExporting(false);
      AppDialog.alert(t('common.error'), t('menu.pdf_error'));
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const allTx = await getTransactions({ limit: 500 });
      if (!allTx || allTx.length === 0) {
        AppDialog.alert(t('common.info'), t('menu.nothing_to_export'));
        setExporting(false);
        return;
      }
      await exportTransactionsToCSV(allTx);
      setExporting(false);
    } catch (e) {
      setExporting(false);
      AppDialog.alert(t('common.error'), t('menu.excel_error'));
    }
  };

  const services = [
    {
      id: 'shopping',
      title: t('menu.shopping_title'),
      desc: t('menu.shopping_desc'),
      icon: 'cart-outline',
      color: '#FB8500',
      action: () => navigation.navigate('ShoppingScreen')
    },
    {
      id: 'accounts',
      title: t('menu.accounts_title'),
      desc: t('menu.accounts_desc'),
      icon: 'card-outline',
      color: '#00A896',
      action: () => navigation.navigate('AccountsScreen')
    },
    {
      id: 'categories',
      title: t('menu.categories_title'),
      desc: t('menu.categories_desc'),
      icon: 'pricetags-outline',
      color: '#8B5CF6',
      action: () => navigation.navigate('CategoriesScreen')
    },
    {
      id: 'debts',
      title: t('menu.debts_title'),
      desc: t('menu.debts_desc'),
      icon: 'swap-horizontal-outline',
      color: '#3B82F6',
      action: () => navigation.navigate('DebtsScreen')
    },
    {
      id: 'reminders',
      title: t('menu.reminders_title'),
      desc: t('menu.reminders_desc'),
      icon: 'time-outline',
      color: '#F59E0B',
      action: () => navigation.navigate('RemindersScreen')
    },
    {
      id: 'recurring',
      title: t('recurring.title'),
      desc: t('menu.recurring_desc'),
      icon: 'repeat-outline',
      color: '#8B5CF6',
      action: () => navigation.navigate('RecurringScreen')
    },
    {
      id: 'goals',
      title: t('menu.savings_title'),
      desc: t('menu.savings_desc'),
      icon: 'flag-outline',
      color: '#10B981',
      action: () => navigation.navigate('SavingsGoalsScreen')
    }
  ];

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
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 4,
            paddingBottom: bottomSafePadding
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Header (Sekkeh Style) */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 12 }]}>
          <View style={[styles.profileRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.avatarWrap, { backgroundColor: colors.accentMuted }]}>
              <Ionicons name="person" size={24} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.userName, { color: colors.textPrimary }]}>{t('menu.header_title')}</Text>
              <Text style={[styles.userBadge, { color: colors.accent }]}>
                {t('menu.header_sub')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={[styles.settingsIconBtn, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Ionicons name="settings-outline" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 1: Financial Services Grid */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('menu.main_services')}
        </Text>

        <View style={styles.gridContainer}>
          {services.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={item.action}
              style={[
                styles.serviceCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.cardBorder,
                  borderRadius: 10
                }
              ]}
            >
              <View style={[styles.serviceIconWrap, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={[styles.serviceTitle, { color: colors.textPrimary }]}>
                {item.title}
              </Text>
              <Text style={[styles.serviceDesc, { color: colors.textMuted }]} numberOfLines={2}>
                {item.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section 2: Reports & Export Banner */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left', marginTop: 16 }]}>
          {t('menu.export_and_reports')}
        </Text>

        <View style={styles.exportRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleExportPDF}
            disabled={exporting}
            style={[
              styles.exportBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
                borderRadius: 8
              }
            ]}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <Ionicons name="document-text" size={20} color="#EF4444" />
                <Text style={[styles.exportBtnText, { color: colors.textPrimary }]}>
                  {t('menu.pdf_report')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleExportExcel}
            disabled={exporting}
            style={[
              styles.exportBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
                borderRadius: 8
              }
            ]}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <Ionicons name="grid" size={20} color="#10B981" />
                <Text style={[styles.exportBtnText, { color: colors.textPrimary }]}>
                  {t('menu.excel_file')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Section 3: App Info & Settings link */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Settings')}
          style={[
            styles.settingsRowCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.cardBorder,
              borderRadius: 10,
              flexDirection: isRTL ? 'row-reverse' : 'row'
            }
          ]}
        >
          <View style={[styles.serviceIconWrap, { backgroundColor: colors.accentMuted }]}>
            <Ionicons name="settings" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1, marginHorizontal: 10, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.serviceTitle, { color: colors.textPrimary }]}>
              {t('settings.title')}
            </Text>
            <Text style={[styles.serviceDesc, { color: colors.textMuted }]}>
              {t('menu.settings_desc')}
            </Text>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.footerInfo}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            {t('app.credit')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 80
  },
  profileCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2
  },
  profileRow: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  userName: {
    fontSize: 14,
    fontWeight: '700'
  },
  userBadge: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2
  },
  settingsIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between'
  },
  serviceCard: {
    width: '48%',
    padding: 14,
    borderWidth: 1,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5
  },
  serviceIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '700'
  },
  serviceDesc: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3
  },
  exportRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '700'
  },
  settingsRowCard: {
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5
  },
  footerInfo: {
    alignItems: 'center',
    marginTop: 20
  },
  footerText: {
    fontSize: 11
  }
});
