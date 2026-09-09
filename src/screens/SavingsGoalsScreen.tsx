import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAppStore } from '../store/useAppStore';
import { SavingsGoal } from '../db/schema';
import {
  createSavingsGoal,
  depositToGoal,
  withdrawFromGoal,
  deleteSavingsGoal
} from '../db/queries/savingsGoals';
import { formatCurrency } from '../utils/currency';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

const GOAL_ICONS = [
  'car-outline', 'shield-checkmark-outline', 'home-outline', 'airplane-outline',
  'school-outline', 'heart-outline', 'gift-outline', 'diamond-outline',
  'business-outline', 'laptop-outline', 'phone-portrait-outline', 'wallet-outline'
];

const GOAL_COLORS = [
  '#3A86FF', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06D6A0', '#6366F1'
];

export const SavingsGoalsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, typography, radius } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);
  const { savingsGoals, refreshAll } = useFinanceStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newCurrency, setNewCurrency] = useState<'IQD' | 'USD'>('USD');
  const [newColor, setNewColor] = useState(GOAL_COLORS[0]);
  const [newIcon, setNewIcon] = useState('car-outline');

  // Deposit/Withdraw modal
  const [activeGoal, setActiveGoal] = useState<SavingsGoal | null>(null);
  const [modalActionType, setModalActionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [actionAmount, setActionAmount] = useState('');

  const handleCreateGoal = async () => {
    if (!newTitle.trim()) {
      Alert.alert(t('common.error'), 'تکایە ناوی ئامانجەکە بنووسە');
      return;
    }
    const target = parseFloat(newTarget);
    if (!target || target <= 0) {
      Alert.alert(t('common.error'), 'بڕی ئامانج دیاری بکە');
      return;
    }

    await createSavingsGoal({
      title: newTitle.trim(),
      target_amount: target,
      currency: newCurrency,
      color: newColor,
      icon: newIcon
    });

    setNewTitle('');
    setNewTarget('');
    setShowAddModal(false);
    await refreshAll();
  };

  const handlePerformAction = async () => {
    if (!activeGoal) return;
    const amount = parseFloat(actionAmount);
    if (!amount || amount <= 0) {
      Alert.alert(t('common.error'), 'بڕی دروست بنووسە');
      return;
    }

    if (modalActionType === 'deposit') {
      await depositToGoal(activeGoal.id, amount);
    } else {
      await withdrawFromGoal(activeGoal.id, amount);
    }

    setActionAmount('');
    setActiveGoal(null);
    await refreshAll();
  };

  const handleDeleteGoal = (goal: SavingsGoal) => {
    Alert.alert(
      t('common.delete'),
      `ئایا دڵنیایت لە سڕینەوەی سندووقی "${goal.title}"؟`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteSavingsGoal(goal.id);
            await refreshAll();
          }
        }
      ]
    );
  };

  const totalUSD = savingsGoals
    .filter((g) => g.currency === 'USD')
    .reduce((sum, g) => sum + g.current_amount, 0);

  const totalIQD = savingsGoals
    .filter((g) => g.currency === 'IQD')
    .reduce((sum, g) => sum + g.current_amount, 0);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={savingsGoals}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            {/* Overview Stats Card */}
            <Card style={[styles.overviewCard, { backgroundColor: colors.surface }]}>
              <Text style={[typography.caption, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
                کۆی گشتی پاشەکەوت لە سندووقەکان
              </Text>
              <View style={[styles.balanceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.mainBalance, { color: colors.textPrimary }]}>
                  {formatCurrency(totalUSD, 'USD')}
                </Text>
                {totalIQD > 0 && (
                  <Text style={[styles.subBalance, { color: colors.income, marginHorizontal: 10 }]}>
                    + {formatCurrency(totalIQD, 'IQD', { isRTL })}
                  </Text>
                )}
              </View>
              <Text style={[typography.captionSmall, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left', marginTop: 4 }]}>
                {savingsGoals.length} سندووقی چالاک
              </Text>
            </Card>

            {/* Add Goal Button */}
            <Button
              title="+ دروستکردنی سندووقی ئامانجی نوێ"
              onPress={() => setShowAddModal(true)}
              variant="primary"
            />
          </View>
        }
        renderItem={({ item }) => {
          const percentage = Math.min(100, Math.round((item.current_amount / item.target_amount) * 100)) || 0;
          const remaining = Math.max(0, item.target_amount - item.current_amount);
          const iconName = item.icon as any || 'flag-outline';

          return (
            <Card style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={[styles.goalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.goalIconCircle, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={iconName} size={22} color={item.color} />
                </View>

                <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[typography.bodySemibold, { color: colors.textPrimary, fontSize: 16 }]}>
                    {item.title}
                  </Text>
                  <Text style={[typography.captionSmall, { color: colors.textMuted }]}>
                    ماوەتەوە: {formatCurrency(remaining, item.currency, { isRTL })}
                  </Text>
                </View>

                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                  <Text style={[styles.percentageBadge, { color: item.color }]}>
                    {percentage}%
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteGoal(item)} style={{ marginTop: 4 }}>
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Progress bar */}
              <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.round }]}>
                <View
                  style={{
                    height: 10,
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                    borderRadius: radius.round
                  }}
                />
              </View>

              {/* Amounts row */}
              <View style={[styles.amountsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700' }]}>
                  کۆکراوەتەوە: {formatCurrency(item.current_amount, item.currency, { isRTL })}
                </Text>
                <Text style={[typography.captionSmall, { color: colors.textMuted }]}>
                  ئامانج: {formatCurrency(item.target_amount, item.currency, { isRTL })}
                </Text>
              </View>

              {/* Actions row: Deposit / Withdraw */}
              <View style={[styles.goalActions, { flexDirection: isRTL ? 'row-reverse' : 'row', borderTopColor: colors.divider }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setActiveGoal(item);
                    setModalActionType('deposit');
                  }}
                  style={[styles.actionPill, { backgroundColor: colors.income + '18', borderColor: colors.income }]}
                >
                  <Ionicons name="add-circle-outline" size={16} color={colors.income} style={{ marginHorizontal: 4 }} />
                  <Text style={[styles.actionPillText, { color: colors.income }]}>خستنەسەر (Deposit)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setActiveGoal(item);
                    setModalActionType('withdraw');
                  }}
                  style={[styles.actionPill, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}
                >
                  <Ionicons name="remove-circle-outline" size={16} color={colors.textSecondary} style={{ marginHorizontal: 4 }} />
                  <Text style={[styles.actionPillText, { color: colors.textSecondary }]}>کێشانەوە</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        }}
      />

      {/* Modal: Add New Goal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 14, textAlign: isRTL ? 'right' : 'left' }]}>
              دروستکردنی سندووقی پاشەکەوت
            </Text>

            <TextInput
              placeholder="ناوی ئامانج (بۆ نموونە: کڕینی ئۆتۆمبێل، زێڕ، گەشت...)"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              textAlign={isRTL ? 'right' : 'left'}
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, borderRadius: radius.md }]}
            />

            {/* Target Amount & Currency */}
            <View style={[styles.amountRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 10 }]}>
              <TextInput
                placeholder="بڕی ئامانج (بۆ نموونە: 8000)"
                placeholderTextColor={colors.textMuted}
                value={newTarget}
                onChangeText={setNewTarget}
                keyboardType="numeric"
                textAlign={isRTL ? 'right' : 'left'}
                style={[styles.modalInput, { flex: 1, backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, borderRadius: radius.md }]}
              />

              <View style={[styles.currencyToggle, { flexDirection: 'row', marginHorizontal: 8 }]}>
                <TouchableOpacity
                  onPress={() => setNewCurrency('USD')}
                  style={[styles.currBtn, { backgroundColor: newCurrency === 'USD' ? colors.accent : colors.surfaceSecondary, borderRadius: radius.sm }]}
                >
                  <Text style={{ color: newCurrency === 'USD' ? colors.textInverse : colors.textPrimary, fontWeight: '700', fontSize: 12 }}>USD $</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setNewCurrency('IQD')}
                  style={[styles.currBtn, { backgroundColor: newCurrency === 'IQD' ? colors.accent : colors.surfaceSecondary, borderRadius: radius.sm }]}
                >
                  <Text style={{ color: newCurrency === 'IQD' ? colors.textInverse : colors.textPrimary, fontWeight: '700', fontSize: 12 }}>IQD</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Colors */}
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 12, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
              ڕەنگی سندووق:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {GOAL_COLORS.map((col) => (
                <TouchableOpacity
                  key={col}
                  onPress={() => setNewColor(col)}
                  style={[
                    styles.colorDot,
                    {
                      backgroundColor: col,
                      borderColor: newColor === col ? colors.textPrimary : 'transparent',
                      borderWidth: newColor === col ? 3 : 0
                    }
                  ]}
                />
              ))}
            </ScrollView>

            {/* Icons */}
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
              ئایکۆنی سندووق:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {GOAL_ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  onPress={() => setNewIcon(ic)}
                  style={[
                    styles.iconChoice,
                    {
                      backgroundColor: newIcon === ic ? colors.accent : colors.surfaceSecondary,
                      borderColor: colors.cardBorder,
                      borderRadius: radius.md
                    }
                  ]}
                >
                  <Ionicons
                    name={ic as any}
                    size={20}
                    color={newIcon === ic ? colors.textInverse : colors.textPrimary}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Buttons */}
            <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Button
                title={t('common.cancel')}
                onPress={() => setShowAddModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title={t('common.save')}
                onPress={handleCreateGoal}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Deposit / Withdraw */}
      <Modal visible={!!activeGoal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }]}>
              {modalActionType === 'deposit' ? 'خستنەسەری پارە بۆ سندووق' : 'کێشانەوەی پارە لە سندووق'}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>
              {activeGoal?.title} ({activeGoal?.currency})
            </Text>

            <TextInput
              placeholder="بڕی پارە بنووسە..."
              placeholderTextColor={colors.textMuted}
              value={actionAmount}
              onChangeText={setActionAmount}
              keyboardType="numeric"
              autoFocus
              textAlign={isRTL ? 'right' : 'left'}
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, borderRadius: radius.md }]}
            />

            <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 16 }]}>
              <Button
                title={t('common.cancel')}
                onPress={() => setActiveGoal(null)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title={modalActionType === 'deposit' ? 'خستنەسەر' : 'کێشانەوە'}
                onPress={handlePerformAction}
                variant="primary"
                style={{ flex: 1 }}
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
  overviewCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12
  },
  balanceRow: {
    alignItems: 'baseline',
    marginTop: 6
  },
  mainBalance: {
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums']
  },
  subBalance: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums']
  },
  goalCard: {
    marginVertical: 6,
    padding: 14,
    borderWidth: 1
  },
  goalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  goalIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center'
  },
  percentageBadge: {
    fontSize: 16,
    fontWeight: '800'
  },
  progressBarBg: {
    height: 10,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 8
  },
  amountsRow: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  goalActions: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: 8
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalBox: {
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5
  },
  modalInput: {
    borderWidth: 1,
    padding: 12,
    fontSize: 14
  },
  amountRow: {
    alignItems: 'center'
  },
  currencyToggle: {
    gap: 4
  },
  currBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginEnd: 8
  },
  iconChoice: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 8
  },
  modalActions: {
    gap: 10
  }
});
