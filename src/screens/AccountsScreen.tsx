import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAppStore } from '../store/useAppStore';
import { Account } from '../db/schema';
import { createAccount, setAccountArchived, deleteAccount } from '../db/queries/accounts';
import { formatCurrency } from '../utils/currency';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { AuroraBackground } from '../components/common/AuroraBackground';

export const AccountsScreen: React.FC = () => {
  const { colors, typography, radius } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);
  const { accounts, refreshAll } = useFinanceStore();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('0');
  const [type, setType] = useState<Account['type']>('cash');
  const [currency, setCurrency] = useState(primaryCurrency);

  const handleCreateAccount = async () => {
    if (!name.trim()) return;
    const startBal = parseFloat(balance) || 0;

    await createAccount({
      name: name.trim(),
      type,
      icon: type === 'bank' ? 'card-outline' : type === 'ewallet' ? 'phone-portrait-outline' : 'cash-outline',
      color: type === 'bank' ? '#2563EB' : type === 'ewallet' ? '#8B5CF6' : '#16A34A',
      starting_balance: startBal,
      currency
    });

    setName('');
    setBalance('0');
    setShowModal(false);
    await refreshAll();
  };

  const handleArchive = async (account: Account) => {
    Alert.alert(
      t('accounts.archive'),
      t('accounts.archive_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('accounts.archive'),
          onPress: async () => {
            await setAccountArchived(account.id, true);
            await refreshAll();
          }
        }
      ]
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
            <Button
              title={t('accounts.add_account')}
              onPress={() => setShowModal(true)}
              variant="primary"
            />
          </View>
        }
        renderItem={({ item }) => (
          <Card style={{ marginVertical: 6, backgroundColor: colors.surface }}>
            <View style={[styles.accRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>

              <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[typography.bodySemibold, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>{item.type}</Text>
              </View>

              <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                <Text style={[typography.tabularLarge, { color: colors.textPrimary, fontSize: 18 }]}>
                  {formatCurrency(item.current_balance, item.currency, { isRTL })}
                </Text>
                <TouchableOpacity onPress={() => handleArchive(item)} style={{ marginTop: 4 }}>
                  <Text style={[typography.captionSmall, { color: colors.textMuted }]}>
                    {t('accounts.archive')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}
      />

      {/* Add Account Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 12 }]}>
              {t('accounts.add_account')}
            </Text>

            <TextInput
              placeholder={t('accounts.account_name')}
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary }]}
            />

            <TextInput
              placeholder={t('accounts.starting_balance')}
              placeholderTextColor={colors.textMuted}
              value={balance}
              onChangeText={setBalance}
              keyboardType="numeric"
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary, marginTop: 10 }]}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Button title={t('common.cancel')} onPress={() => setShowModal(false)} variant="secondary" style={{ flex: 1 }} />
              <Button title={t('common.save')} onPress={handleCreateAccount} variant="primary" style={{ flex: 1 }} />
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
  accRow: {
    alignItems: 'center'
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
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
