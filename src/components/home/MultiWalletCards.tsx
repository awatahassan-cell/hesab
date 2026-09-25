import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

          // The scheme decides the card's look: a plain surface card tinted by
          // the account's own colour, a solid/gradient colour card, or a soft
          // pastel card — colours cycled from the scheme so neighbours differ.
          const tile = colors.walletCards[index % colors.walletCards.length];
          const look =
            colors.walletStyle === 'filled'
              ? {
                  bg: tile.bg,
                  ink: tile.fg,
                  subInk: tile.fg,
                  subOpacity: 0.78,
                  chipBg: 'rgba(255, 255, 255, 0.2)',
                  iconColor: tile.fg,
                  badgeBg: 'rgba(255, 255, 255, 0.18)',
                  badgeInk: tile.fg
                }
              : colors.walletStyle === 'pastel'
              ? {
                  bg: tile.bg,
                  ink: colors.textPrimary,
                  subInk: colors.textSecondary,
                  subOpacity: 1,
                  chipBg: colors.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)',
                  iconColor: tile.fg,
                  badgeBg: colors.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
                  badgeInk: tile.fg
                }
              : {
                  bg: colors.surface,
                  border: colors.cardBorder,
                  ink: colors.textPrimary,
                  subInk: colors.textSecondary,
                  subOpacity: 1,
                  chipBg: tint + '1F',
                  iconColor: tint,
                  badgeBg: tint + '14',
                  badgeInk: tint
                };

          return (
            <TouchableOpacity
              key={acc.id || index}
              activeOpacity={0.8}
              onPress={() => onPressAccount && onPressAccount(acc)}
              style={[
                styles.walletCard,
                {
                  backgroundColor: look.bg,
                  borderColor: look.border,
                  borderWidth: colors.walletStyle === 'plain' ? 1 : 0,
                  borderRadius: radius.lg
                }
              ]}
            >
              {colors.walletStyle === 'filled' && (
                <>
                  <LinearGradient
                    colors={[tile.bg, tile.bg2 || tile.bg]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {/* A soft disc in the corner — just enough depth that a solid
                      card reads as a card rather than a colour swatch. */}
                  <View
                    pointerEvents="none"
                    style={[styles.shine, isRTL ? { left: -28 } : { right: -28 }]}
                  />
                </>
              )}
              <View style={[styles.cardTopRow, { flexDirection: row }]}>
                <View style={[styles.iconWrap, { backgroundColor: look.chipBg, borderRadius: radius.sm }]}>
                  <Ionicons name={iconName} size={18} color={look.iconColor} />
                </View>
                <View style={[styles.typeBadge, { backgroundColor: look.badgeBg }]}>
                  <Text style={[styles.typeBadgeText, { color: look.badgeInk }]}>{t(typeLabelKey)}</Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <Text
                  numberOfLines={1}
                  style={[styles.accountName, { color: look.subInk, opacity: look.subOpacity, textAlign: isRTL ? 'right' : 'left' }]}
                >
                  {acc.name}
                </Text>
                <Text
                  style={[styles.balanceText, { color: look.ink, textAlign: isRTL ? 'right' : 'left' }]}
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
    justifyContent: 'space-between',
    overflow: 'hidden'
  },
  shine: {
    position: 'absolute',
    top: -34,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.14)'
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
