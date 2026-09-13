import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

export const MultiWalletCards: React.FC<MultiWalletCardsProps> = ({
  accounts,
  currency,
  isRTL,
  onPressAccount,
  onAddAccount
}) => {
  const { colors, radius } = useTheme();

  if (!accounts || accounts.length === 0) {
    return null;
  }

  // Predefined palette for wallets to give them a premium card look
  const getWalletTheme = (index: number, type?: string) => {
    if (type === 'bank' || index === 1) {
      return {
        bg: '#0284C715',
        border: '#0284C735',
        text: '#0284C7',
        iconBg: '#0284C725',
        icon: 'card-outline'
      };
    }
    if (type === 'cash' || index === 0) {
      return {
        bg: '#10B98115',
        border: '#10B98135',
        text: '#10B981',
        iconBg: '#10B98125',
        icon: 'cash-outline'
      };
    }
    return {
      bg: '#F59E0B15',
      border: '#F59E0B35',
      text: '#F59E0B',
      iconBg: '#F59E0B25',
      icon: 'wallet-outline'
    };
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.titleWithBadge}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>جزدانەکانت</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.countBadgeText, { color: colors.textSecondary }]}>{accounts.length}</Text>
          </View>
        </View>
        {onAddAccount && (
          <TouchableOpacity activeOpacity={0.7} onPress={onAddAccount} style={styles.addBtn}>
            <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
            <Text style={[styles.addBtnText, { color: colors.accent }]}>جزدانی نوێ</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollList,
          { flexDirection: isRTL ? 'row-reverse' : 'row' }
        ]}
      >
        {accounts.map((acc, index) => {
          const theme = getWalletTheme(index, acc.type);
          const iconName = (acc.icon as any) || theme.icon;
          const displayBalance = typeof (acc as any).current_balance === 'number' ? (acc as any).current_balance : (typeof acc.balance === 'number' ? acc.balance : 0);
          const accCurrency = acc.currency || currency;

          return (
            <TouchableOpacity
              key={acc.id || index}
              activeOpacity={0.8}
              onPress={() => onPressAccount && onPressAccount(acc)}
              style={[
                styles.walletCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: theme.border,
                  borderRadius: radius.lg
                }
              ]}
            >
              <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.iconWrap, { backgroundColor: theme.iconBg }]}>
                  <Ionicons name={iconName} size={18} color={theme.text} />
                </View>
                <View style={[styles.typeBadge, { backgroundColor: theme.bg }]}>
                  <Text style={[styles.typeBadgeText, { color: theme.text }]}>
                    {acc.type === 'cash' ? 'کاش' : acc.type === 'bank' ? 'بانک' : 'جزدان'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <Text numberOfLines={1} style={[styles.accountName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {acc.name}
                </Text>
                <Text style={[styles.balanceText, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {formatCurrency(displayBalance, accCurrency)}
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
    paddingHorizontal: 16,
    marginBottom: 8
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  title: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 15,
    fontWeight: '700'
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8
  },
  countBadgeText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 11,
    fontWeight: '600'
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  addBtnText: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 12,
    fontWeight: '500'
  },
  scrollList: {
    paddingHorizontal: 16,
    gap: 10
  },
  walletCard: {
    width: 175,
    padding: 12,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    justifyContent: 'space-between'
  },
  cardTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  typeBadgeText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 10,
    fontWeight: '700'
  },
  cardBottom: {
    gap: 2
  },
  accountName: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 12,
    fontWeight: '500'
  },
  balanceText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 15,
    fontWeight: '700'
  }
});
