import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  StatusBar as RNStatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAppStore } from '../store/useAppStore';
import { formatCurrency } from '../utils/currency';
import { Button } from '../components/common/Button';
import { setBudget, deleteBudget } from '../db/queries/budgets';
import { createSavingsGoal, updateSavingsGoal, deleteSavingsGoal } from '../db/queries/savingsGoals';
import { createReminder, toggleReminderPaidStatus, deleteReminder } from '../db/queries/reminders';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { AuroraBackground } from '../components/common/AuroraBackground';

export const GoalsAndBudgetsScreen: React.FC = () => {
  const { colors, typography, radius } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);
  const { budgetProgressList, savingsGoals, reminders, categories, refreshAll } = useFinanceStore();

  const [activeTab, setActiveTab] = useState<'budgets' | 'goals' | 'reminders'>('budgets');

  // Budget Modal State
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | undefined>(undefined);

  // Goal Modal State
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalCurrentAmount, setGoalCurrentAmount] = useState('');
  const [goalIcon, setGoalIcon] = useState('flag-outline');

  // Reminder Modal State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderAmount, setReminderAmount] = useState('');
  const [reminderDueDate, setReminderDueDate] = useState('');

  // Custom Delete Confirm Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    refreshAll();
  }, []);

  // Save Category Budget
  const handleSaveBudget = async () => {
    const val = parseFloat(budgetAmount);
    if (!val || val <= 0) {
      Alert.alert(t('common.error'), 'تکایە بڕی بودجە بنووسە');
      return;
    }
    await setBudget(val, selectedCatId);
    setBudgetAmount('');
    setSelectedCatId(undefined);
    setShowBudgetModal(false);
    await refreshAll();
  };

  // Save Goal
  const handleSaveGoal = async () => {
    if (!goalTitle.trim()) {
      Alert.alert(t('common.error'), 'تکایە ناوی ئامانج بنووسە');
      return;
    }
    const target = parseFloat(goalTargetAmount) || 0;
    const current = parseFloat(goalCurrentAmount) || 0;
    if (target <= 0) {
      Alert.alert(t('common.error'), 'تکایە بڕی ئامانج دیاریبکە');
      return;
    }

    await createSavingsGoal({
      title: goalTitle.trim(),
      target_amount: target,
      current_amount: current,
      currency: primaryCurrency,
      icon: goalIcon,
      color: '#00A896'
    });

    setGoalTitle('');
    setGoalTargetAmount('');
    setGoalCurrentAmount('');
    setShowGoalModal(false);
    await refreshAll();
  };

  // Save Reminder
  const handleSaveReminder = async () => {
    if (!reminderTitle.trim()) {
      Alert.alert(t('common.error'), 'تکایە ناوی پارەدان یان قیستەکە بنووسە');
      return;
    }
    const amount = parseFloat(reminderAmount) || 0;
    if (amount <= 0) {
      Alert.alert(t('common.error'), 'تکایە بڕی پارە دیاریبکە');
      return;
    }

    const parsedDay = Math.min(31, Math.max(1, parseInt(reminderDueDate.trim(), 10) || 1));

    await createReminder({
      title: reminderTitle.trim(),
      amount,
      currency: primaryCurrency,
      due_day: parsedDay,
      frequency: 'monthly'
    });

    setReminderTitle('');
    setReminderAmount('');
    setReminderDueDate('');
    setShowReminderModal(false);
    await refreshAll();
  };

  const insets = useSafeAreaInsets();
  const topSafeInset = Platform.OS === 'android'
    ? Math.max(RNStatusBar.currentHeight || 0, insets.top, 48) + 8
    : Math.max(insets.top, 20) + 4;
  const bottomSafePadding = Platform.OS === 'android'
    ? Math.max(insets.bottom, 48) + 85
    : Math.max(insets.bottom, 16) + 70;
  const safeCategories = (categories || []).filter((c) => c && c.id && c.type === 'expense');

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: topSafeInset }]}>
      <AuroraBackground />
      {/* Sekkeh Top Segmented Tabs: بودجەکان | ئامانجەکان | وەبیرهێنەرەوەکان */}
      <View style={[styles.tabSelectorRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder, marginTop: 6 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('budgets')}
          style={[
            styles.tabSelectorBtn,
            activeTab === 'budgets' && { backgroundColor: colors.accent, borderRadius: 8 }
          ]}
        >
          <Text
            style={[
              styles.tabSelectorText,
              { color: activeTab === 'budgets' ? '#FFFFFF' : colors.textMuted }
            ]}
          >
            بودجەکان
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('goals')}
          style={[
            styles.tabSelectorBtn,
            activeTab === 'goals' && { backgroundColor: colors.accent, borderRadius: 8 }
          ]}
        >
          <Text
            style={[
              styles.tabSelectorText,
              { color: activeTab === 'goals' ? '#FFFFFF' : colors.textMuted }
            ]}
          >
            ئامانجی پاشەکەوت
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('reminders')}
          style={[
            styles.tabSelectorBtn,
            activeTab === 'reminders' && { backgroundColor: colors.accent, borderRadius: 8 }
          ]}
        >
          <Text
            style={[
              styles.tabSelectorText,
              { color: activeTab === 'reminders' ? '#FFFFFF' : colors.textMuted }
            ]}
          >
            قیست و پارەدانەکان
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomSafePadding }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= VIEW 1: BUDGETS ================= */}
        {activeTab === 'budgets' && (
          <View>
            <View style={[styles.subHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View>
                <Text style={[styles.subHeaderTitle, { color: colors.textPrimary }]}>
                  بودجەی دیاریکراوی بەشەکان
                </Text>
                <Text style={[styles.subHeaderDesc, { color: colors.textMuted }]}>
                  دیاریکردنی سنوری خەرجی بۆ کۆنترۆڵکردنی تێچووەکان
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowBudgetModal(true)}
                style={[styles.addNewBtn, { backgroundColor: colors.accent, borderRadius: 8 }]}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addNewBtnText}>بودجەی نوێ</Text>
              </TouchableOpacity>
            </View>

            {budgetProgressList.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 12 }]}>
                <Ionicons name="pie-chart-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyBoxTitle, { color: colors.textPrimary }]}>
                  هێشتا هیچ بودجەیەک دانەنراوە
                </Text>
                <Text style={[styles.emptyBoxDesc, { color: colors.textMuted }]}>
                  کلیک لەسەر دوگمەی + بودجەی نوێ بکە بۆ دیاریکردنی سنوری خەرجی بەشەکان
                </Text>
              </View>
            ) : (
              budgetProgressList.map((item) => {
                const catName = item.budget.category_custom_name ||
                  (item.budget.category_name_key ? t(`categories.names.${item.budget.category_name_key}`) : 'بودجەی گشتی مانگانە');
                const pct = Math.min(100, item.percentage);
                const barColor = item.isOverBudget ? colors.danger : item.isWarning ? colors.warning : colors.income;

                return (
                  <View
                    key={item.budget.id}
                    style={[
                      styles.budgetCard,
                      { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 12 }
                    ]}
                  >
                    <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardItemTitle, { color: colors.textPrimary }]}>{catName}</Text>
                        <Text style={[styles.cardItemSub, { color: colors.textMuted }]}>
                          خەرجکراو: {formatCurrency(item.spent, primaryCurrency, { isRTL })} لە {formatCurrency(item.budget.amount, primaryCurrency, { isRTL })}
                        </Text>
                      </View>

                      <View style={[styles.pctTag, { backgroundColor: barColor + '20' }]}>
                        <Text style={[styles.pctTagText, { color: barColor }]}>
                          {item.percentage}%
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => {
                          setDeleteConfirm({
                            visible: true,
                            title: 'سڕینەوەی بودجە',
                            message: `ئایا دڵنیایت لە سڕینەوەی بودجەی (${catName})؟`,
                            onConfirm: async () => {
                              await deleteBudget(item.budget.id);
                              await refreshAll();
                              setDeleteConfirm((prev) => ({ ...prev, visible: false }));
                            }
                          });
                        }}
                        style={{ padding: 4 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    {/* Progress Track */}
                    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSecondary }]}>
                      <View style={[styles.progressBar, { width: `${pct}%`, backgroundColor: barColor }]} />
                    </View>

                    {item.isOverBudget && (
                      <View style={[styles.warningRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="alert-circle" size={14} color={colors.danger} />
                        <Text style={[styles.warningText, { color: colors.danger, marginHorizontal: 4 }]}>
                          ئاگاداری: بودجەی ئەم بەشە تێپەڕیوە!
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ================= VIEW 2: SAVINGS GOALS ================= */}
        {activeTab === 'goals' && (
          <View>
            <View style={[styles.subHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View>
                <Text style={[styles.subHeaderTitle, { color: colors.textPrimary }]}>
                  ئامانجەکانی پاشەکەوت
                </Text>
                <Text style={[styles.subHeaderDesc, { color: colors.textMuted }]}>
                  هاندەری پاشەکەوت بۆ کڕینی خانوو، ئۆتۆمبێل، سەفەر
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowGoalModal(true)}
                style={[styles.addNewBtn, { backgroundColor: colors.accent, borderRadius: 8 }]}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addNewBtnText}>ئامانجی نوێ</Text>
              </TouchableOpacity>
            </View>

            {savingsGoals.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 12 }]}>
                <Ionicons name="flag-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyBoxTitle, { color: colors.textPrimary }]}>
                  هیچ ئامانجێکی پاشەکەوت نییە
                </Text>
                <Text style={[styles.emptyBoxDesc, { color: colors.textMuted }]}>
                  بۆ دانانی ئامانجی نوێ، کلیک لەسەر دوگمەی + ئامانجی نوێ بکە
                </Text>
              </View>
            ) : (
              savingsGoals.map((g) => {
                const target = g.target_amount || 1;
                const pct = Math.min(100, Math.round(((g.current_amount || 0) / target) * 100));

                return (
                  <View
                    key={g.id}
                    style={[
                      styles.budgetCard,
                      { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 12 }
                    ]}
                  >
                    <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.goalIconWrap, { backgroundColor: colors.accentMuted }]}>
                        <Ionicons name={(g.icon as any) || 'flag'} size={20} color={colors.accent} />
                      </View>

                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <Text style={[styles.cardItemTitle, { color: colors.textPrimary }]}>{g.title}</Text>
                        <Text style={[styles.cardItemSub, { color: colors.textMuted }]}>
                          پاشەکەوتکراو: {formatCurrency(g.current_amount || 0, g.currency || primaryCurrency, { isRTL })} لە {formatCurrency(g.target_amount, g.currency || primaryCurrency, { isRTL })}
                        </Text>
                      </View>

                      <View style={[styles.circularPctBadge, { borderColor: colors.accent }]}>
                        <Text style={[styles.circularPctText, { color: colors.accent }]}>{pct}%</Text>
                      </View>
                    </View>

                    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSecondary, marginTop: 10 }]}>
                      <View style={[styles.progressBar, { width: `${pct}%`, backgroundColor: colors.accent }]} />
                    </View>

                    <View style={[styles.goalActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 12 }]}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          Alert.prompt
                            ? Alert.prompt('زیادکردنی پارە بۆ ئامانج', 'چەند پارەت پاشەکەوت کرد؟', async (amt) => {
                                const num = parseFloat(amt || '0');
                                if (num > 0) {
                                  await updateSavingsGoal(g.id, { current_amount: (g.current_amount || 0) + num });
                                  await refreshAll();
                                }
                              })
                            : (async () => {
                                const addAmount = 50000;
                                await updateSavingsGoal(g.id, { current_amount: (g.current_amount || 0) + addAmount });
                                await refreshAll();
                              })();
                        }}
                        style={[styles.smallActionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, borderRadius: 6 }]}
                      >
                        <Ionicons name="add-circle-outline" size={14} color={colors.accent} />
                        <Text style={[styles.smallActionBtnText, { color: colors.accent, marginHorizontal: 4 }]}>
                          زیادکردنی بڕ
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setDeleteConfirm({
                            visible: true,
                            title: 'سڕینەوەی ئامانج',
                            message: `ئایا دڵنیایت لە سڕینەوەی ئامانجی پاشەکەوتی (${g.title})؟`,
                            onConfirm: async () => {
                              await deleteSavingsGoal(g.id);
                              await refreshAll();
                              setDeleteConfirm((prev) => ({ ...prev, visible: false }));
                            }
                          });
                        }}
                        style={{ padding: 4 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ================= VIEW 3: REMINDERS ================= */}
        {activeTab === 'reminders' && (
          <View>
            <View style={[styles.subHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View>
                <Text style={[styles.subHeaderTitle, { color: colors.textPrimary }]}>
                  قیست و پارەدانە مانگانەکان
                </Text>
                <Text style={[styles.subHeaderDesc, { color: colors.textMuted }]}>
                  پڕۆژەی ڕووناکی، کرێی خانوو، قیستی ئۆتۆمبێل...
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowReminderModal(true)}
                style={[styles.addNewBtn, { backgroundColor: colors.accent, borderRadius: 8 }]}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addNewBtnText}>قیستی نوێ</Text>
              </TouchableOpacity>
            </View>

            {reminders.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 12 }]}>
                <Ionicons name="time-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyBoxTitle, { color: colors.textPrimary }]}>
                  هیچ قیست و پارەدانێک تۆمار نەکراوە
                </Text>
                <Text style={[styles.emptyBoxDesc, { color: colors.textMuted }]}>
                  بۆ زیادکردنی قیست یان پارەدانی مانگانە، کلیک لەسەر دوگمەی + قیستی نوێ بکە
                </Text>
              </View>
            ) : (
              reminders.map((r) => (
                <View
                  key={r.id}
                  style={[
                    styles.budgetCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: r.is_paid ? colors.cardBorder : colors.warning + '50',
                      borderRadius: 12
                    }
                  ]}
                >
                  <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => toggleReminderPaidStatus(r.id, r.is_paid).then(refreshAll)}
                      style={[
                        styles.checkCircle,
                        {
                          backgroundColor: r.is_paid ? colors.income : 'transparent',
                          borderColor: r.is_paid ? colors.income : colors.textMuted
                        }
                      ]}
                    >
                      {r.is_paid ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                    </TouchableOpacity>

                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text
                        style={[
                          styles.cardItemTitle,
                          {
                            color: colors.textPrimary,
                            textDecorationLine: r.is_paid ? 'line-through' : 'none'
                          }
                        ]}
                      >
                        {r.title}
                      </Text>
                      <Text style={[styles.cardItemSub, { color: colors.textMuted }]}>
                        بڕ: {formatCurrency(r.amount, r.currency || primaryCurrency, { isRTL })} • ڕۆژی: {r.due_day}ی مانگ
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        setDeleteConfirm({
                          visible: true,
                          title: 'سڕینەوەی وەبیرهێنەرەوە',
                          message: `ئایا دڵنیایت لە سڕینەوەی (${r.title})؟`,
                          onConfirm: async () => {
                            await deleteReminder(r.id);
                            await refreshAll();
                            setDeleteConfirm((prev) => ({ ...prev, visible: false }));
                          }
                        });
                      }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal: New Category Budget */}
      <Modal visible={showBudgetModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 14 }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>
              دانانی سنوری بودجە
            </Text>

            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
              بەش هەڵبژێرە:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => setSelectedCatId(undefined)}
                style={[
                  styles.catSelectChip,
                  {
                    backgroundColor: selectedCatId === undefined ? colors.accent : colors.surfaceSecondary,
                    borderColor: colors.cardBorder,
                    borderRadius: 6
                  }
                ]}
              >
                <Text style={{ color: selectedCatId === undefined ? '#FFFFFF' : colors.textPrimary, fontWeight: '700', fontSize: 11 }}>
                  بودجەی گشتی
                </Text>
              </TouchableOpacity>
              {safeCategories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedCatId(c.id)}
                  style={[
                    styles.catSelectChip,
                    {
                      backgroundColor: selectedCatId === c.id ? colors.accent : colors.surfaceSecondary,
                      borderColor: colors.cardBorder,
                      borderRadius: 6
                    }
                  ]}
                >
                  <Text style={{ color: selectedCatId === c.id ? '#FFFFFF' : colors.textPrimary, fontWeight: '700', fontSize: 11 }}>
                    {c.custom_name || t(`categories.names.${c.name_key}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
              بڕی بودجەی مانگانە ({primaryCurrency}):
            </Text>
            <TextInput
              placeholder="بۆ نموونە: 300000"
              placeholderTextColor={colors.textMuted}
              value={budgetAmount}
              onChangeText={setBudgetAmount}
              keyboardType="numeric"
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, borderRadius: 8 }]}
              autoFocus
            />

            <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 18 }]}>
              <Button
                title={t('common.cancel')}
                onPress={() => setShowBudgetModal(false)}
                variant="secondary"
                style={{ flex: 1, borderRadius: 8 }}
              />
              <Button
                title={t('common.save')}
                onPress={handleSaveBudget}
                variant="primary"
                style={{ flex: 1, borderRadius: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: New Goal */}
      <Modal visible={showGoalModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 14 }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>
              ئامانجی نوێی پاشەکەوت
            </Text>

            <TextInput
              placeholder="ناوی ئامانج (بۆ نموونە: کڕینی ئۆتۆمبێل)"
              placeholderTextColor={colors.textMuted}
              value={goalTitle}
              onChangeText={setGoalTitle}
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, borderRadius: 8, marginBottom: 10 }]}
            />

            <TextInput
              placeholder="بڕی پێویست (Target Amount)"
              placeholderTextColor={colors.textMuted}
              value={goalTargetAmount}
              onChangeText={setGoalTargetAmount}
              keyboardType="numeric"
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, borderRadius: 8, marginBottom: 10 }]}
            />

            <TextInput
              placeholder="بڕی پاشەکەوتکراوی سەرەتایی (ئارەزوومەندانە)"
              placeholderTextColor={colors.textMuted}
              value={goalCurrentAmount}
              onChangeText={setGoalCurrentAmount}
              keyboardType="numeric"
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, borderRadius: 8 }]}
            />

            <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 18 }]}>
              <Button
                title={t('common.cancel')}
                onPress={() => setShowGoalModal(false)}
                variant="secondary"
                style={{ flex: 1, borderRadius: 8 }}
              />
              <Button
                title={t('common.save')}
                onPress={handleSaveGoal}
                variant="primary"
                style={{ flex: 1, borderRadius: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: New Reminder */}
      <Modal visible={showReminderModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 14 }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>
              زیادکردنی قیست یان پارەدانی مانگانە
            </Text>

            <TextInput
              placeholder="ناوی پارەدان (بۆ نموونە: پڕۆژەی ڕووناکی، قیستی خانوو)"
              placeholderTextColor={colors.textMuted}
              value={reminderTitle}
              onChangeText={setReminderTitle}
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, borderRadius: 8, marginBottom: 10 }]}
            />

            <TextInput
              placeholder="بڕی پارە (Amount)"
              placeholderTextColor={colors.textMuted}
              value={reminderAmount}
              onChangeText={setReminderAmount}
              keyboardType="numeric"
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, borderRadius: 8, marginBottom: 10 }]}
            />

            <TextInput
              placeholder="بەرواری دان (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={reminderDueDate}
              onChangeText={setReminderDueDate}
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, borderRadius: 8 }]}
            />

            <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 18 }]}>
              <Button
                title={t('common.cancel')}
                onPress={() => setShowReminderModal(false)}
                variant="secondary"
                style={{ flex: 1, borderRadius: 8 }}
              />
              <Button
                title={t('common.save')}
                onPress={handleSaveReminder}
                variant="primary"
                style={{ flex: 1, borderRadius: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <ConfirmModal
        visible={deleteConfirm.visible}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        isDanger={true}
        onConfirm={deleteConfirm.onConfirm}
        onCancel={() => setDeleteConfirm((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  tabSelectorRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1
  },
  tabSelectorBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabSelectorText: {
    fontSize: 12,
    fontWeight: '700'
  },
  content: {
    padding: 16,
    paddingBottom: 80
  },
  subHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  subHeaderTitle: {
    fontSize: 14,
    fontWeight: '700'
  },
  subHeaderDesc: {
    fontSize: 11,
    marginTop: 2
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  addNewBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 4
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 10
  },
  emptyBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10
  },
  emptyBoxDesc: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16
  },
  budgetCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2
  },
  cardTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardItemTitle: {
    fontSize: 13,
    fontWeight: '700'
  },
  cardItemSub: {
    fontSize: 11,
    marginTop: 2
  },
  pctTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginHorizontal: 8
  },
  pctTagText: {
    fontSize: 11,
    fontWeight: '800'
  },
  progressTrack: {
    height: 7,
    borderRadius: 3.5,
    overflow: 'hidden',
    marginTop: 8
  },
  progressBar: {
    height: 7,
    borderRadius: 3.5
  },
  warningRow: {
    alignItems: 'center',
    marginTop: 6
  },
  warningText: {
    fontSize: 11,
    fontWeight: '600'
  },
  goalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  circularPctBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  circularPctText: {
    fontSize: 11,
    fontWeight: '800'
  },
  goalActionsRow: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1
  },
  smallActionBtnText: {
    fontSize: 11,
    fontWeight: '700'
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center'
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
  catSelectChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    marginRight: 6
  },
  modalInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    fontSize: 14
  },
  modalActions: {
    gap: 10
  }
});
