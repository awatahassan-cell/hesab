import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
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
import { AppDialog } from '../components/common/AppDialog';
import { ReceiptViewer } from '../components/transactions/ReceiptViewer';
import { CurvedHeader } from '../components/navigation/CurvedHeader';

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
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

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
    AppDialog.alert(
      t('common.actions'),
      `${tx.amount} ${tx.currency}`,
      [
        ...(tx.receipt_uri
          ? [
              {
                text: t('transactions.view_receipt'),
                onPress: () => setReceiptUri(tx.receipt_uri ?? null)
              }
            ]
          : []),
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
      AppDialog.alert(t('common.error'), 'Could not export CSV');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CurvedHeader
        title={t('tabs.transactions', 'مامەڵەکان')}
      >
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.22)',
              borderColor: 'transparent',
              flexDirection: isRTL ? 'row-reverse' : 'row',
              borderRadius: 14,
              paddingHorizontal: 12,
              height: 44
            }
          ]}
        >
          <Ionicons name="search-outline" size={18} color="rgba(255, 255, 255, 0.85)" />
          <TextInput
            placeholder={t('transactions.search_placeholder')}
            placeholderTextColor="rgba(255, 255, 255, 0.70)"
            value={search}
            onChangeText={setSearch}
            textAlign={isRTL ? 'right' : 'left'}
            style={[styles.searchInput, { color: '#FFFFFF' }]}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="rgba(255, 255, 255, 0.90)" />
            </TouchableOpacity>
          ) : null}
        </View>
      </CurvedHeader>

      {/* Type filter chips & CSV Export */}
      <View style={[styles.chipsContainer, { backgroundColor: colors.background }]}>
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
        title={t('transactions.delete_confirm_title', t('transactions.delete_confirm_title'))}
        message={t('transactions.delete_confirm_desc', t('transactions.delete_confirm_desc'))}
        confirmText={t('common.delete', t('common.reset'))}
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

      <ReceiptViewer uri={receiptUri} onClose={() => setReceiptUri(null)} />
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
    fontSize: 14,
    minWidth: 0
  },
  chipsContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6
  },
  chipsRow: {
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
