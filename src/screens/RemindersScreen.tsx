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
import { Reminder } from '../db/schema';
import {
  createReminder,
  deleteReminder,
  payReminderAndLogExpense,
  toggleReminderPaidStatus
} from '../db/queries/reminders';
import { formatCurrency } from '../utils/currency';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { AuroraBackground } from '../components/common/AuroraBackground';

export const RemindersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, typography, radius } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);
  const { reminders, categories, refreshAll } = useFinanceStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'IQD' | 'USD'>('IQD');
  const [dueDay, setDueDay] = useState('1');
  const [selectedCatId, setSelectedCatId] = useState('');

  const currentDay = new Date().getDate();

  const handleCreateReminder = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), 'تکایە ناوی وەبیرهێنەرەوە بنووسە');
      return;
    }
    const parsedAmount = parseFloat(amount) || 0;
    const parsedDay = Math.min(31, Math.max(1, parseInt(dueDay, 10) || 1));

    await createReminder({
      title: title.trim(),
      amount: parsedAmount,
      currency,
      due_day: parsedDay,
      category_id: selectedCatId || undefined
    });

    setTitle('');
    setAmount('');
    setDueDay('1');
    setShowAddModal(false);
    await refreshAll();
  };

  const handlePay = async (item: Reminder) => {
    Alert.alert(
      'دان و تۆمارکردن',
      `ئایا دەتەوێت بڕی ${formatCurrency(item.amount, item.currency)} بۆ "${item.title}" تۆمار بکەیت وەک خەرجی؟`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'تۆمارکردن',
          onPress: async () => {
            await payReminderAndLogExpense(item);
            await refreshAll();
          }
        }
      ]
    );
  };

  const handleTogglePaid = async (item: Reminder) => {
    await toggleReminderPaidStatus(item.id, item.is_paid);
    await refreshAll();
  };

  const handleDelete = (item: Reminder) => {
    Alert.alert(
      t('common.delete'),
      `ئایا دڵنیایت لە سڕینەوەی "${item.title}"؟`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteReminder(item.id);
            await refreshAll();
          }
        }
      ]
    );
  };

  const totalMonthlyIQD = reminders
    .filter((r) => r.currency === 'IQD')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalMonthlyUSD = reminders
    .filter((r) => r.currency === 'USD')
    .reduce((sum, r) => sum + r.amount, 0);

  const paidCount = reminders.filter((r) => r.is_paid).length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AuroraBackground />
      <FlatList
        data={reminders}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            {/* Overview Card */}
            <Card style={[styles.statsCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.statCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    کۆی پارەدانەکان
                  </Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {formatCurrency(totalMonthlyIQD, 'IQD', { isRTL })}
                  </Text>
                  {totalMonthlyUSD > 0 && (
                    <Text style={[typography.captionSmall, { color: colors.accent, fontWeight: '700' }]}>
                      + {formatCurrency(totalMonthlyUSD, 'USD')}
                    </Text>
                  )}
                </View>

                <View style={[styles.vDivider, { backgroundColor: colors.divider }]} />

                <View style={[styles.statCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    دۆخی ئەم مانگە
                  </Text>
                  <Text style={[styles.statValue, { color: colors.income }]}>
                    {paidCount} / {reminders.length} دراوە
                  </Text>
                  <Text style={[typography.captionSmall, { color: colors.expense }]}>
                    {reminders.length - paidCount} ماوەتەوە
                  </Text>
                </View>
              </View>
            </Card>

            {/* Add New Reminder Button */}
            <Button
              title="+ زیادکردنی وەبیرهێنەرەوەی نوێ"
              onPress={() => setShowAddModal(true)}
              variant="primary"
            />
          </View>
        }
        renderItem={({ item }) => {
          const daysLeft = item.due_day - currentDay;
          let statusText = '';
          let statusColor = colors.textMuted;

          if (item.is_paid) {
            statusText = 'دراوە ✅';
            statusColor = colors.income;
          } else if (daysLeft === 0) {
            statusText = 'ئەمڕۆ کاتیەتی! ⚠️';
            statusColor = colors.warning;
          } else if (daysLeft > 0) {
            statusText = `${daysLeft} ڕۆژی ماوە`;
            statusColor = colors.textSecondary;
          } else {
            statusText = `${Math.abs(daysLeft)} ڕۆژ دواکەوتووە!`;
            statusColor = colors.danger;
          }

          return (
            <Card
              style={[
                styles.itemCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: item.is_paid ? colors.income + '40' : colors.cardBorder,
                  opacity: item.is_paid ? 0.75 : 1
                }
              ]}
            >
              <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.iconBox, { backgroundColor: item.is_paid ? colors.income + '20' : colors.accent + '15' }]}>
                  <Ionicons
                    name={item.is_paid ? 'checkmark-circle' : 'notifications-outline'}
                    size={22}
                    color={item.is_paid ? colors.income : colors.accent}
                  />
                </View>

                <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[typography.bodySemibold, { color: colors.textPrimary }]}>
                    {item.title}
                  </Text>
                  <Text style={[typography.captionSmall, { color: colors.textMuted }]}>
                    ڕۆژی {item.due_day}ی مانگ • {statusText}
                  </Text>
                </View>

                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                  <Text style={[styles.amountText, { color: colors.textPrimary }]}>
                    {formatCurrency(item.amount, item.currency, { isRTL })}
                  </Text>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={{ marginTop: 4 }}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action row */}
              <View style={[styles.cardActions, { flexDirection: isRTL ? 'row-reverse' : 'row', borderTopColor: colors.divider }]}>
                {!item.is_paid ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handlePay(item)}
                    style={[styles.payBtn, { backgroundColor: colors.income, borderRadius: radius.md }]}
                  >
                    <Ionicons name="card-outline" size={16} color="#FFFFFF" style={{ marginHorizontal: 4 }} />
                    <Text style={styles.payBtnText}>دان (تۆمار وەک خەرجی)</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleTogglePaid(item)}
                    style={[styles.undoBtn, { borderColor: colors.cardBorder, borderRadius: radius.md }]}
                  >
                    <Ionicons name="arrow-undo-outline" size={14} color={colors.textSecondary} style={{ marginHorizontal: 4 }} />
                    <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>پاشگەزبوونەوە</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          );
        }}
      />

      {/* Modal: Add Reminder */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 14, textAlign: isRTL ? 'right' : 'left' }]}>
              زیادکردنی وەبیرهێنەرەوەی نوێ
            </Text>

            {/* Title */}
            <TextInput
              placeholder="ناوی خەرجی (بۆ نموونە: پڕۆژەی ڕووناکی، موەلیدە، ئینتەرنێت...)"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              textAlign={isRTL ? 'right' : 'left'}
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, borderRadius: radius.md }]}
            />

            {/* Amount & Currency */}
            <View style={[styles.amountRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 10 }]}>
              <TextInput
                placeholder="بڕی پارە (بۆ نموونە: 45000)"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                textAlign={isRTL ? 'right' : 'left'}
                style={[styles.modalInput, { flex: 1, backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, borderRadius: radius.md }]}
              />

              <View style={[styles.currencyToggle, { flexDirection: 'row', marginHorizontal: 8 }]}>
                <TouchableOpacity
                  onPress={() => setCurrency('IQD')}
                  style={[styles.currBtn, { backgroundColor: currency === 'IQD' ? colors.accent : colors.surfaceSecondary, borderRadius: radius.sm }]}
                >
                  <Text style={{ color: currency === 'IQD' ? colors.textInverse : colors.textPrimary, fontWeight: '700', fontSize: 12 }}>IQD</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCurrency('USD')}
                  style={[styles.currBtn, { backgroundColor: currency === 'USD' ? colors.accent : colors.surfaceSecondary, borderRadius: radius.sm }]}
                >
                  <Text style={{ color: currency === 'USD' ? colors.textInverse : colors.textPrimary, fontWeight: '700', fontSize: 12 }}>USD $</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Due Day of Month */}
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 12, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }]}>
              ڕۆژی مانگ بۆ پارەدان (1 تا 31):
            </Text>
            <TextInput
              placeholder="1"
              placeholderTextColor={colors.textMuted}
              value={dueDay}
              onChangeText={setDueDay}
              keyboardType="numeric"
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, borderRadius: radius.md }]}
            />

            {/* Actions */}
            <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 18 }]}>
              <Button
                title={t('common.cancel')}
                onPress={() => setShowAddModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title={t('common.save')}
                onPress={handleCreateReminder}
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
  statsCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12
  },
  statsRow: {
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statCol: {
    flex: 1
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
    fontVariant: ['tabular-nums']
  },
  vDivider: {
    width: 1,
    height: 44,
    marginHorizontal: 12
  },
  itemCard: {
    marginVertical: 6,
    padding: 14,
    borderWidth: 1
  },
  cardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums']
  },
  cardActions: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  payBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1
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
  modalActions: {
    gap: 10
  }
});
