import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAppStore } from '../store/useAppStore';
import { Transaction } from '../db/schema';
import { deleteTransaction, createTransaction } from '../db/queries/transactions';
import { TransactionItem } from '../components/transactions/TransactionItem';
import { EmptyState } from '../components/common/EmptyState';
import { formatTransactionDate } from '../utils/dates';
import { exportTransactionsToCSV } from '../utils/export';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { AuroraBackground } from '../components/common/AuroraBackground';

interface TransactionsScreenProps {
  navigation: any;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({ navigation }) => {
  const { colors, typography, radius, spacing } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const { transactions, refreshAll } = useFinanceStore();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [deleteTxTarget, setDeleteTxTarget] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedType !== 'all' && tx.type !== selectedType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const noteMatch = tx.note?.toLowerCase().includes(q);
        const catMatch = (tx.category_custom_name || tx.category_name_key || '').toLowerCase().includes(q);
        const accMatch = tx.account_name?.toLowerCase().includes(q);
        return noteMatch || catMatch || accMatch;
      }
      return true;
    });
  }, [transactions, selectedType, search]);

  // Group transactions by date
  const groupedSections = useMemo(() => {
    const groups: { [date: string]: Transaction[] } = {};
    for (const tx of filteredTransactions) {
      const day = tx.date_time.substring(0, 10);
      if (!groups[day]) groups[day] = [];
      groups[day].push(tx);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  const handleTransactionAction = (tx: Transaction) => {
    Alert.alert(
      t('common.actions'),
      `${tx.amount} ${tx.currency}`,
      [
        {
          text: t('common.duplicate'),
          onPress: async () => {
            await createTransaction({
              type: tx.type,
              amount: tx.amount,
              currency: tx.currency,
              account_id: tx.account_id,
              to_account_id: tx.to_account_id,
              category_id: tx.category_id,
              subcategory_id: tx.subcategory_id,
              date_time: new Date().toISOString(),
              note: tx.note ? `${tx.note} (copy)` : undefined
            });
            await refreshAll();
          }
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            setDeleteTxTarget(tx);
          }
        },
        { text: t('common.cancel'), style: 'cancel' }
      ]
    );
  };

  const handleExportCSV = async () => {
    try {
      await exportTransactionsToCSV(filteredTransactions);
    } catch (e) {
      Alert.alert(t('common.error'), 'Could not export CSV');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AuroraBackground />
      {/* Top Search & Filter Bar */}
      <View style={[styles.searchBarContainer, { backgroundColor: colors.surface, borderBottomColor: colors.cardBorder }]}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.cardBorder,
              flexDirection: isRTL ? 'row-reverse' : 'row'
            }
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            placeholder={t('transactions.search_placeholder')}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            textAlign={isRTL ? 'right' : 'left'}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Type filter chips & CSV Export */}
        <View style={[styles.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {(['all', 'expense', 'income', 'transfer'] as const).map((tp) => {
            const isSelected = selectedType === tp;
            return (
              <TouchableOpacity
                key={tp}
                onPress={() => setSelectedType(tp)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.accent : colors.surfaceSecondary,
                    borderColor: isSelected ? colors.accent : colors.cardBorder
                  }
                ]}
              >
                <Text
                  style={[
                    typography.captionSmall,
                    { color: isSelected ? colors.textInverse : colors.textSecondary }
                  ]}
                >
                  {t(`transactions.filter_${tp}`)}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity onPress={handleExportCSV} style={styles.exportBtn}>
            <Ionicons name="download-outline" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Transactions List */}
      {groupedSections.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title={t('common.no_data')}
          description={t('transactions.no_results')}
        />
      ) : (
        <FlatList
          data={groupedSections}
          keyExtractor={(item) => item[0]}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          renderItem={({ item: [dateStr, txs] }) => (
            <View style={styles.dateGroup}>
              <View style={[styles.dateHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {formatTransactionDate(dateStr, {
                    today: t('common.today'),
                    yesterday: t('common.yesterday')
                  })}
                </Text>
              </View>

              {txs.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  onPress={() => handleTransactionAction(tx)}
                  showDate={false}
                />
              ))}
            </View>
          )}
        />
      )}

      {/* Custom Transaction Deletion Modal */}
      <ConfirmModal
        visible={!!deleteTxTarget}
        title={t('transactions.delete_confirm_title', 'سڕینەوەی مامەڵە')}
        message={t('transactions.delete_confirm_desc', 'ئایا دڵنیایت دەتەوێت ئەم مامەڵەیە بسڕیتەوە؟ باڵانسی هەژمارەکە ڕاستدەکرێتەوە.')}
        confirmText={t('common.delete', 'سڕینەوە')}
        isDanger={true}
        icon="trash-outline"
        onConfirm={async () => {
          if (deleteTxTarget) {
            await deleteTransaction(deleteTxTarget.id);
            await refreshAll();
            setDeleteTxTarget(null);
          }
        }}
        onCancel={() => setDeleteTxTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  searchBarContainer: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  searchBox: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center'
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 14
  },
  chipsRow: {
    marginTop: 10,
    alignItems: 'center'
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 6
  },
  exportBtn: {
    padding: 6,
    marginLeft: 'auto'
  },
  dateGroup: {
    marginBottom: 16
  },
  dateHeader: {
    marginBottom: 6,
    paddingHorizontal: 4
  }
});
