import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAppStore } from '../store/useAppStore';
import { Account } from '../db/schema';
import {
  createAccount,
  updateAccount,
  setAccountArchived,
  deleteAccount,
  getArchivedAccounts
} from '../db/queries/accounts';
import { COUNTRIES_CURRENCIES, formatCurrency } from '../utils/currency';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { AuroraBackground } from '../components/common/AuroraBackground';
import { AppDialog } from '../components/common/AppDialog';

/** Look and colour follow the type, so a new account is never a grey blob. */
const TYPES: { id: Account['type']; labelKey: string; icon: string; color: string }[] = [
  { id: 'cash', labelKey: 'accounts.type_cash', icon: 'cash-outline', color: '#16A34A' },
  { id: 'bank', labelKey: 'accounts.type_bank', icon: 'card-outline', color: '#2563EB' },
  { id: 'ewallet', labelKey: 'accounts.type_wallet', icon: 'phone-portrait-outline', color: '#8B5CF6' },
  { id: 'savings', labelKey: 'accounts.type_savings', icon: 'wallet-outline', color: '#10B981' },
  { id: 'custom', labelKey: 'accounts.type_custom', icon: 'ellipsis-horizontal-outline', color: '#F59E0B' }
];

export const AccountsScreen: React.FC = () => {
  const { colors, typography, radius } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);
  const { accounts, totalBalancePrimary, refreshAll } = useFinanceStore();

  const [showModal, setShowModal] = useState(false);
  /** The account being edited, or null when adding a new one. */
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('0');
  const [type, setType] = useState<Account['type']>('cash');
  const [currency, setCurrency] = useState(primaryCurrency);
  const [archived, setArchived] = useState<Account[]>([]);

  const loadArchived = useCallback(async () => {
    setArchived(await getArchivedAccounts());
  }, []);

  useEffect(() => {
    loadArchived();
  }, [loadArchived, accounts]);

  const refresh = async () => {
    await refreshAll();
    await loadArchived();
  };

  const typeOf = (id: Account['type']) => TYPES.find((x) => x.id === id) ?? TYPES[0];

  const openAdd = () => {
    setEditing(null);
    setName('');
    setBalance('0');
    setType('cash');
    setCurrency(primaryCurrency);
    setShowModal(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setName(account.name);
    setBalance(String(account.starting_balance));
    setType(account.type);
    setCurrency(account.currency);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const preset = typeOf(type);

    if (editing) {
      // The opening balance is deliberately not editable here: it is baked
      // into every balance already computed from it, so changing it would
      // silently restate history. Add a correcting transaction instead.
      await updateAccount(editing.id, {
        name: name.trim(),
        type,
        icon: preset.icon,
        color: preset.color,
        currency
      });
    } else {
      await createAccount({
        name: name.trim(),
        type,
        icon: preset.icon,
        color: preset.color,
        starting_balance: parseFloat(balance) || 0,
        currency
      });
    }

    setShowModal(false);
    await refresh();
  };

  const handleArchive = (account: Account) => {
    AppDialog.alert(
      t('accounts.archive'),
      t('accounts.archive_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('accounts.archive'),
          onPress: async () => {
            await setAccountArchived(account.id, true);
            await refresh();
          }
        }
      ]
    );
  };

  const handleUnarchive = async (account: Account) => {
    await setAccountArchived(account.id, false);
    await refresh();
  };

  const handleDelete = (account: Account) => {
    AppDialog.alert(
      t('common.delete'),
      t('common.delete_confirm_named', { name: account.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteAccount(account.id);
            await refresh();
          }
        }
      ],
      { tone: 'danger' }
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AuroraBackground />
      <FlatList
        data={accounts}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Card style={{ backgroundColor: colors.surface, marginBottom: 12 }}>
              <Text style={[typography.caption, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('accounts.total_balance')}
              </Text>
              <Text
                style={[
                  typography.tabularLarge,
                  { color: colors.textPrimary, fontSize: 24, textAlign: isRTL ? 'right' : 'left' }
                ]}
              >
                {formatCurrency(totalBalancePrimary, primaryCurrency, { isRTL })}
              </Text>
            </Card>
            <Button title={t('accounts.add_account')} onPress={openAdd} variant="primary" />
          </View>
        }
        renderItem={({ item }) => (
          <Card style={{ marginVertical: 6, backgroundColor: colors.surface }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => openEdit(item)}
              style={[styles.accRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>

              <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[typography.bodySemibold, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t(typeOf(item.type).labelKey)} · {item.currency}
                </Text>
              </View>

              <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                <Text style={[typography.tabularLarge, { color: colors.textPrimary, fontSize: 18 }]}>
                  {formatCurrency(item.current_balance, item.currency, { isRTL })}
                </Text>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12, marginTop: 4 }}>
                  <TouchableOpacity onPress={() => openEdit(item)}>
                    <Text style={[typography.captionSmall, { color: colors.accent }]}>{t('common.edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleArchive(item)}>
                    <Text style={[typography.captionSmall, { color: colors.textMuted }]}>
                      {t('accounts.archive')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Card>
        )}
        ListFooterComponent={
          archived.length > 0 ? (
            <View style={{ marginTop: 20 }}>
              <Text
                style={[
                  typography.captionSmall,
                  { color: colors.textMuted, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }
                ]}
              >
                {t('accounts.archived_accounts')}
              </Text>
              {archived.map((item) => (
                <Card key={item.id} style={{ marginVertical: 5, backgroundColor: colors.surface, opacity: 0.72 }}>
                  <View style={[styles.accRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.iconBox, { backgroundColor: colors.surfaceSecondary }]}>
                      <Ionicons name="archive-outline" size={20} color={colors.textMuted} />
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={[typography.bodySemibold, { color: colors.textPrimary }]}>{item.name}</Text>
                      <Text style={[typography.caption, { color: colors.textMuted }]}>
                        {formatCurrency(item.current_balance, item.currency, { isRTL })}
                      </Text>
                    </View>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 }}>
                      <TouchableOpacity onPress={() => handleUnarchive(item)}>
                        <Text style={[typography.captionSmall, { color: colors.accent }]}>
                          {t('accounts.unarchive')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(item)}>
                        <Text style={[typography.captionSmall, { color: colors.danger }]}>
                          {t('common.delete')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          ) : null
        }
      />

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text
              style={[
                typography.titleSmall,
                { color: colors.textPrimary, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }
              ]}
            >
              {editing ? t('accounts.edit_account') : t('accounts.add_account')}
            </Text>

            <TextInput
              placeholder={t('accounts.account_name')}
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              textAlign={isRTL ? 'right' : 'left'}
              style={[
                styles.modalInput,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary }
              ]}
            />

            <Text style={[typography.captionSmall, { color: colors.textMuted, marginTop: 12, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('accounts.account_type')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {TYPES.map((item) => {
                const on = type === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setType(item.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: on ? item.color : colors.surfaceSecondary,
                        borderColor: on ? item.color : colors.cardBorder,
                        borderRadius: radius.sm
                      }
                    ]}
                  >
                    <Ionicons name={item.icon as any} size={14} color={on ? '#FFFFFF' : colors.textMuted} />
                    <Text style={{ color: on ? '#FFFFFF' : colors.textPrimary, fontWeight: '600', fontSize: 12, marginHorizontal: 5 }}>
                      {t(item.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[typography.captionSmall, { color: colors.textMuted, marginTop: 12, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('accounts.currency')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {COUNTRIES_CURRENCIES.map((c) => {
                const on = currency === c.currencyCode;
                return (
                  <TouchableOpacity
                    key={c.countryCode}
                    onPress={() => setCurrency(c.currencyCode)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: on ? colors.accent : colors.surfaceSecondary,
                        borderColor: on ? colors.accent : colors.cardBorder,
                        borderRadius: radius.sm
                      }
                    ]}
                  >
                    <Text style={{ color: on ? colors.textInverse : colors.textPrimary, fontWeight: '600', fontSize: 12 }}>
                      {c.currencyCode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {!editing && (
              <>
                <Text style={[typography.captionSmall, { color: colors.textMuted, marginTop: 12, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('accounts.starting_balance')}
                </Text>
                <TextInput
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  value={balance}
                  onChangeText={setBalance}
                  keyboardType="numeric"
                  textAlign={isRTL ? 'right' : 'left'}
                  style={[
                    styles.modalInput,
                    { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary }
                  ]}
                />
              </>
            )}

            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 18 }}>
              <Button title={t('common.cancel')} onPress={() => setShowModal(false)} variant="secondary" style={{ flex: 1 }} />
              <Button title={t('common.save')} onPress={handleSave} variant="primary" style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  accRow: { alignItems: 'center' },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginRight: 8
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
    maxWidth: 360,
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
