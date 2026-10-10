import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { RecurringRule } from '../db/schema';
import {
  getAllRecurringRules,
  setRecurringActive,
  deleteRecurringRule
} from '../db/queries/recurring';
import { formatCurrency } from '../utils/currency';
import { formatLocalDate } from '../utils/dates';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { AuroraBackground } from '../components/common/AuroraBackground';
import { CurvedHeader } from '../components/navigation/CurvedHeader';
import { AppDialog } from '../components/common/AppDialog';

/**
 * The rules that post transactions on their own.
 *
 * There is no server behind this app, so a rule catches up the next time the
 * app is opened rather than firing while the phone sits idle. The next date
 * shown here is when it will post, not a promise about the exact minute.
 */
export const RecurringScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, typography, radius } = useTheme();
  const { t, i18n } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const { refreshAll } = useFinanceStore();

  const [rules, setRules] = useState<RecurringRule[]>([]);

  const load = useCallback(async () => {
    setRules(await getAllRecurringRules());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (rule: RecurringRule) => {
    await setRecurringActive(rule.id, !rule.is_active);
    await load();
  };

  const remove = (rule: RecurringRule) => {
    AppDialog.alert(
      t('common.delete'),
      t('common.delete_confirm_named', { name: labelFor(rule) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteRecurringRule(rule.id);
            await load();
            await refreshAll();
          }
        }
      ],
      { tone: 'danger' }
    );
  };

  const labelFor = (rule: RecurringRule): string => {
    if (rule.note) return rule.note;
    if (rule.category_custom_name) return rule.category_custom_name;
    if (rule.category_name_key) {
      return t(`categories.names.${rule.category_name_key}`, { defaultValue: rule.category_name_key });
    }
    return t(`types.${rule.type}`);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CurvedHeader
        title={t('recurring.title', 'مامەڵە دووبارەبووەوەکان')}
        showBack={Boolean(navigation?.canGoBack && navigation.canGoBack())}
        onBack={() => navigation?.goBack?.()}
      />
      <AuroraBackground />
      <FlatList
        data={rules}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={
          <EmptyState
            icon="repeat-outline"
            title={t('recurring.empty_title')}
            description={t('recurring.empty_body')}
          />
        }
        renderItem={({ item }) => {
          const paused = !item.is_active;
          const tint = item.type === 'income' ? colors.income : colors.expense;

          return (
            <Card style={{ marginVertical: 6, backgroundColor: colors.surface, opacity: paused ? 0.6 : 1 }}>
              <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.iconBox, { backgroundColor: tint + '18' }]}>
                  <Ionicons name={paused ? 'pause' : 'repeat'} size={20} color={tint} />
                </View>

                <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[typography.bodySemibold, { color: colors.textPrimary }]}>
                    {labelFor(item)}
                  </Text>
                  <Text style={[typography.captionSmall, { color: colors.textMuted }]}>
                    {t(`add.recurring_${item.frequency}`)}
                    {' · '}
                    {paused
                      ? t('recurring.paused')
                      : t('recurring.next_on', { date: formatLocalDate(new Date(item.next_run), i18n.language) })}
                  </Text>
                </View>

                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                  <Text style={[typography.tabularNumber, { color: tint }]}>
                    {item.type === 'income' ? '+' : '-'}
                    {formatCurrency(item.amount, item.currency, { isRTL })}
                  </Text>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12, marginTop: 4 }}>
                    <TouchableOpacity onPress={() => toggle(item)}>
                      <Text style={[typography.captionSmall, { color: colors.accent }]}>
                        {paused ? t('recurring.resume') : t('recurring.pause')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(item)}>
                      <Text style={[typography.captionSmall, { color: colors.danger }]}>
                        {t('common.delete')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Card>
          );
        }}
        ListHeaderComponent={
          rules.length > 0 ? (
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }
              ]}
            >
              {t('recurring.hint')}
            </Text>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  row: { alignItems: 'center' },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
