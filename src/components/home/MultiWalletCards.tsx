import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { FONT_FAMILY_BOLD, FONT_FAMILY_SEMIBOLD, FONT_FAMILY_MEDIUM } from '../../theme/typography';
import { formatCurrency } from '../../utils/currency';

interface AccountItem {
  id: string;
  name: string;
  type?: string;
  balance?: number;
  currency?: string;
  icon?: string;
  color?: string;
}

interface MultiWalletCardsProps {
  accounts: AccountItem[];
  currency: string;
  isRTL: boolean;
  onPressAccount?: (acc: AccountItem) => void;
  onAddAccount?: () => void;
}

const TYPE_LABEL_KEYS: Record<string, string> = {
  cash: 'accounts.type_cash',
  bank: 'accounts.type_bank',
  ewallet: 'accounts.type_wallet',
  savings: 'accounts.type_savings',
  custom: 'accounts.type_custom'
};

const FALLBACK_ICON: Record<string, string> = {
  cash: 'cash-outline',
  bank: 'card-outline',
  ewallet: 'phone-portrait-outline',
  savings: 'wallet-outline',
  custom: 'ellipsis-horizontal-outline'
};

export const MultiWalletCards: React.FC<MultiWalletCardsProps> = ({
  accounts,
  currency,
  isRTL,
  onPressAccount,
  onAddAccount
}) => {
  const { colors, radius } = useTheme();
  const { t } = useTranslation();

  if (!accounts || accounts.length === 0) {
    return null;
  }

  const row = isRTL ? 'row-reverse' : ('row' as const);

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { flexDirection: row }]}>
        <View style={[styles.titleWithBadge, { flexDirection: row }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('wallets.title')}</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.countBadgeText, { color: colors.textSecondary }]}>{accounts.length}</Text>
          </View>
        </View>
        {onAddAccount && (
          <TouchableOpacity activeOpacity={0.7} onPress={onAddAccount} style={[styles.addBtn, { flexDirection: row }]}>
            <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
            <Text style={[styles.addBtnText, { color: colors.accent }]}>{t('wallets.add')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollList, { flexDirection: row }]}
      >
        {accounts.map((acc, index) => {
          // Every account already carries its own icon and colour, chosen
          // when it was created — read those first, and only fall back to a
          // type default for older rows that predate that choice.
          const tint = acc.color || colors.accent;
          const iconName = (acc.icon as any) || FALLBACK_ICON[acc.type || ''] || 'wallet-outline';
          const displayBalance =
            typeof (acc as any).current_balance === 'number'
              ? (acc as any).current_balance
              : typeof acc.balance === 'number'
              ? acc.balance
              : 0;
          const accCurrency = acc.currency || currency;
          const typeLabelKey = TYPE_LABEL_KEYS[acc.type || ''] || 'accounts.type_wallet';

          return (
            <TouchableOpacity
              key={acc.id || index}
              activeOpacity={0.8}
              onPress={() => onPressAccount && onPressAccount(acc)}
              style={[
                styles.walletCard,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg }
              ]}
            >
              <View style={[styles.cardTopRow, { flexDirection: row }]}>
                <View style={[styles.iconWrap, { backgroundColor: tint + '1F', borderRadius: radius.sm }]}>
                  <Ionicons name={iconName} size={18} color={tint} />
                </View>
                <View style={[styles.typeBadge, { backgroundColor: tint + '14' }]}>
                  <Text style={[styles.typeBadgeText, { color: tint }]}>{t(typeLabelKey)}</Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <Text
                  numberOfLines={1}
                  style={[styles.accountName, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}
                >
                  {acc.name}
                </Text>
                <Text
                  style={[styles.balanceText, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                  numberOfLines={1}
                >
                  {formatCurrency(displayBalance, accCurrency, { isRTL })}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  titleWithBadge: {
    alignItems: 'center',
    gap: 6
  },
  title: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 15
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8
  },
  countBadgeText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 11
  },
  addBtn: {
    alignItems: 'center',
    gap: 4
  },
  addBtnText: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 12
  },
  scrollList: {
    gap: 10,
    paddingBottom: 2
  },
  walletCard: {
    width: 172,
    padding: 14,
    borderWidth: 1,
    justifyContent: 'space-between'
  },
  cardTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6
  },
  typeBadgeText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 10
  },
  cardBottom: {
    gap: 3
  },
  accountName: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 12
  },
  balanceText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 16,
    fontVariant: ['tabular-nums']
  }
});
