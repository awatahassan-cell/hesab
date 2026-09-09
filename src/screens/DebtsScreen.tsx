import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAppStore } from '../store/useAppStore';
import { Debt } from '../db/schema';
import { getAllDebts, createDebt, settleDebt } from '../db/queries/debts';
import { formatCurrency } from '../utils/currency';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmModal } from '../components/common/ConfirmModal';

export const DebtsScreen: React.FC = () => {
  const { colors, typography, radius } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);
  const { accounts, debtLentTotal, debtBorrowedTotal, refreshAll } = useFinanceStore();

  const [activeTab, setActiveTab] = useState<'lent' | 'borrowed'>('lent');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [settleTarget, setSettleTarget] = useState<Debt | null>(null);

  // Form states
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadDebts();
  }, [activeTab]);

  const loadDebts = async () => {
    const data = await getAllDebts(activeTab);
    setDebts(data);
  };

  const handleCreate = async () => {
    const num = parseFloat(amount);
    if (!personName.trim() || !num || num <= 0) return;

    await createDebt({
      type: activeTab,
      person_name: personName.trim(),
      amount: num,
      currency: primaryCurrency,
      account_id: selectedAccountId || accounts[0]?.id,
      date: new Date().toISOString(),
      note: note.trim() || undefined
    });

    setPersonName('');
    setAmount('');
    setNote('');
    setShowAddModal(false);
    await refreshAll();
    await loadDebts();
  };

  const handleSettle = (debt: Debt) => {
    setSettleTarget(debt);
  };

  const confirmSettle = async () => {
    if (settleTarget) {
      await settleDebt(settleTarget.id);
      setSettleTarget(null);
      await refreshAll();
      await loadDebts();
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Top Banner Totals */}
      <View style={[styles.banner, { backgroundColor: colors.surface, borderBottomColor: colors.cardBorder }]}>
        <View style={[styles.bannerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.col}>
            <Text style={[typography.caption, { color: colors.debtLent }]}>{t('debts.lent_summary')}</Text>
            <Text style={[typography.tabularNumber, { color: colors.textPrimary, fontSize: 20 }]}>
              {formatCurrency(debtLentTotal, primaryCurrency, { isRTL })}
            </Text>
          </View>

          <View style={[styles.vDivider, { backgroundColor: colors.divider }]} />

          <View style={styles.col}>
            <Text style={[typography.caption, { color: colors.debtBorrowed }]}>{t('debts.borrowed_summary')}</Text>
            <Text style={[typography.tabularNumber, { color: colors.textPrimary, fontSize: 20 }]}>
              {formatCurrency(debtBorrowedTotal, primaryCurrency, { isRTL })}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ marginHorizontal: 16, marginTop: 12 }}>
        <SegmentedControl
          options={[
            { value: 'lent', label: t('debts.lent_out') },
            { value: 'borrowed', label: t('debts.borrowed') }
          ]}
          selected={activeTab}
          onSelect={(v: any) => setActiveTab(v)}
        />
      </View>

      {/* List */}
      <FlatList
        data={debts}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <Card style={{ marginVertical: 4, backgroundColor: colors.surface }}>
            <View style={[styles.debtItemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[typography.bodySemibold, { color: colors.textPrimary }]}>
                  {item.person_name}
                </Text>
                {item.note ? (
                  <Text style={[typography.caption, { color: colors.textMuted }]}>{item.note}</Text>
                ) : null}
                <Text style={[typography.captionSmall, { color: colors.textMuted, marginTop: 4 }]}>
                  {item.date.substring(0, 10)} • {item.account_name}
                </Text>
              </View>

              <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                <Text
                  style={[
                    typography.tabularNumber,
                    {
                      color: item.type === 'lent' ? colors.debtLent : colors.debtBorrowed,
                      fontSize: 18
                    }
                  ]}
                >
                  {formatCurrency(item.amount, item.currency, { isRTL })}
                </Text>

                {item.is_settled ? (
                  <Text style={[typography.captionSmall, { color: colors.income, marginTop: 4 }]}>
                    ✓ {t('debts.settled_badge')}
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleSettle(item)}
                    style={[styles.settleBtn, { backgroundColor: colors.accentMuted }]}
                  >
                    <Text style={[typography.captionSmall, { color: colors.accent, fontWeight: '700' }]}>
                      {t('debts.mark_settled')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={t('debts.title')}
            description={t('common.no_data')}
          />
        }
      />

      {/* Floating Add Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowAddModal(true)}
        style={[styles.fab, { backgroundColor: colors.accent }]}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 12 }]}>
              {t('debts.add_debt')}
            </Text>

            <TextInput
              placeholder={t('debts.person_name')}
              placeholderTextColor={colors.textMuted}
              value={personName}
              onChangeText={setPersonName}
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary }]}
            />

            <TextInput
              placeholder={t('common.amount')}
              placeholderTextColor={colors.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, marginTop: 10 }]}
            />

            <TextInput
              placeholder={t('common.note')}
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, marginTop: 10 }]}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Button title={t('common.cancel')} onPress={() => setShowAddModal(false)} variant="secondary" style={{ flex: 1 }} />
              <Button title={t('common.save')} onPress={handleCreate} variant="primary" style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Debt Settlement Modal */}
      <ConfirmModal
        visible={!!settleTarget}
        title={t('debts.mark_settled', 'تەواوکردنی قەرز')}
        message={t('debts.settle_confirm', 'ئایا ئەم قەرزە یەکلاکرایەوە؟ باڵانسی هەژمارەکەت نوێ دەکرێتەوە.')}
        confirmText={t('common.confirm', 'دڵنیابوونەوە')}
        isDanger={false}
        icon="checkmark-circle-outline"
        onConfirm={confirmSettle}
        onCancel={() => setSettleTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  banner: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  bannerRow: {
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  col: {
    flex: 1,
    alignItems: 'center'
  },
  vDivider: {
    width: 1,
    height: 36
  },
  debtItemRow: {
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  settleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 6
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  modalBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  }
});
