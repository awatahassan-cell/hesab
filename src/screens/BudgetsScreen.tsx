import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAppStore } from '../store/useAppStore';
import { setBudget, deleteBudget, BudgetProgress } from '../db/queries/budgets';
import { formatCurrency } from '../utils/currency';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { AuroraBackground } from '../components/common/AuroraBackground';
import { CurvedHeader } from '../components/navigation/CurvedHeader';

export const BudgetsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, typography, radius } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);
  const { monthStartDay, setMonthStartDay } = useAppStore();
  const { budgetProgressList, categories, refreshAll } = useFinanceStore();

  const [showModal, setShowModal] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | undefined>(undefined);

  const handleSaveBudget = async () => {
    const val = parseFloat(budgetAmount);
    if (!val || val <= 0) return;
    await setBudget(val, selectedCatId);
    setBudgetAmount('');
    setSelectedCatId(undefined);
    setShowModal(false);
    await refreshAll();
  };

  const handleDeleteBudget = async (id: string) => {
    await deleteBudget(id);
    await refreshAll();
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CurvedHeader
        title={t('budgets.title', 'بودجەکان')}
        showBack={Boolean(navigation?.canGoBack && navigation.canGoBack())}
        onBack={() => navigation?.goBack?.()}
      />
      <AuroraBackground />
      <FlatList
        data={budgetProgressList}
        keyExtractor={(i) => i.budget.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            {/* Month Start Day Configuration */}
            <Card style={{ backgroundColor: colors.surface, marginBottom: 12 }}>
              <Text style={[typography.bodySemibold, { color: colors.textPrimary }]}>
                {t('budgets.month_start_day')}
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                {t('budgets.month_start_desc')}
              </Text>
              <View style={[styles.daySelector, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {[1, 5, 10, 15, 20, 25].map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={async () => {
                      await setMonthStartDay(d);
                      await refreshAll();
                    }}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: monthStartDay === d ? colors.accent : colors.surfaceSecondary,
                        borderColor: monthStartDay === d ? colors.accent : colors.cardBorder
                      }
                    ]}
                  >
                    <Text style={{ color: monthStartDay === d ? colors.textInverse : colors.textPrimary, fontWeight: '600' }}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            <Button
              title={t('budgets.set_budget')}
              onPress={() => setShowModal(true)}
              variant="primary"
            />
          </View>
        }
        renderItem={({ item }) => {
          const catName = item.budget.category_custom_name ||
            (item.budget.category_name_key ? t(`categories.names.${item.budget.category_name_key}`) : t('budgets.overall_budget'));

          return (
            <Card style={{ marginVertical: 6, backgroundColor: colors.surface }}>
              <View style={[styles.budgetRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodySemibold, { color: colors.textPrimary }]}>{catName}</Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {t('budgets.spent', { amount: formatCurrency(item.spent, primaryCurrency, { isRTL }) })} /{' '}
                    {formatCurrency(item.budget.amount, primaryCurrency, { isRTL })}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      typography.titleSmall,
                      { color: item.isOverBudget ? colors.danger : item.isWarning ? colors.warning : colors.income }
                    ]}
                  >
                    {item.percentage}%
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteBudget(item.budget.id)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={[styles.barBg, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.round }]}>
                <View
                  style={{
                    height: 8,
                    width: `${Math.min(100, item.percentage)}%`,
                    backgroundColor: item.isOverBudget ? colors.danger : item.isWarning ? colors.warning : colors.income,
                    borderRadius: radius.round
                  }}
                />
              </View>
            </Card>
          );
        }}
      />

      {/* Add Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 12 }]}>
              {t('budgets.set_budget')}
            </Text>

            <TextInput
              placeholder={t('common.amount')}
              placeholderTextColor={colors.textMuted}
              value={budgetAmount}
              onChangeText={setBudgetAmount}
              keyboardType="numeric"
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary }]}
            />

            {/* Category selection */}
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 12 }]}>
              {t('common.category')} ({t('common.optional')})
            </Text>
            <ScrollView horizontal style={{ marginVertical: 8 }}>
              <TouchableOpacity
                onPress={() => setSelectedCatId(undefined)}
                style={[
                  styles.catChip,
                  { backgroundColor: !selectedCatId ? colors.accent : colors.surfaceSecondary }
                ]}
              >
                <Text style={{ color: !selectedCatId ? colors.textInverse : colors.textPrimary }}>
                  {t('budgets.overall_budget')}
                </Text>
              </TouchableOpacity>
              {categories.filter(c => c.type === 'expense').map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedCatId(c.id)}
                  style={[
                    styles.catChip,
                    { backgroundColor: selectedCatId === c.id ? colors.accent : colors.surfaceSecondary }
                  ]}
                >
                  <Text style={{ color: selectedCatId === c.id ? colors.textInverse : colors.textPrimary }}>
                    {c.custom_name || t(`categories.names.${c.name_key}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Button title={t('common.cancel')} onPress={() => setShowModal(false)} variant="secondary" style={{ flex: 1 }} />
              <Button title={t('common.save')} onPress={handleSaveBudget} variant="primary" style={{ flex: 1 }} />
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
  daySelector: {
    gap: 8,
    marginTop: 10
  },
  dayChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1
  },
  budgetRow: {
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  barBg: {
    height: 8,
    marginTop: 10,
    overflow: 'hidden'
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
  },
  catChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 6
  }
});
