import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, DimensionValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account } from '../../db/schema';
import { formatCurrency } from '../../utils/currency';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from 'react-i18next';

interface BankCardProps {
  account: Account;
  isSelected?: boolean;
  onPress?: () => void;
  width?: DimensionValue;
}

const CARD_THEMES: Record<string, { bg: string; secondary: string; text: string; chip: string }> = {
  bank: { bg: '#1B3B48', secondary: '#244D5E', text: '#FFFFFF', chip: '#E6C687' },
  ewallet: { bg: '#00838F', secondary: '#0097A7', text: '#FFFFFF', chip: '#E6C687' },
  cash: { bg: '#00A896', secondary: '#02C39A', text: '#FFFFFF', chip: '#FFE082' },
  savings: { bg: '#4A5568', secondary: '#718096', text: '#FFFFFF', chip: '#F6E05E' },
  custom: { bg: '#2D3748', secondary: '#4A5568', text: '#FFFFFF', chip: '#E2E8F0' }
};

export const BankCard: React.FC<BankCardProps> = ({
  account,
  isSelected = false,
  onPress,
  width
}) => {
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);

  const themeKey = account.type in CARD_THEMES ? account.type : 'bank';
  const cardColor = account.color || CARD_THEMES[themeKey].bg;
  const chipColor = CARD_THEMES[themeKey].chip;

  const rawId = (account.id || '').replace(/[^0-9]/g, '');
  const last4 = (rawId.slice(-4) || '7926').padStart(4, '0');
  const maskedNumber = `••••  ••••  ••••  ${last4}`;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.cardContainer,
        {
          backgroundColor: cardColor,
          width: width || '100%',
          borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
          borderWidth: isSelected ? 2.5 : 1
        }
      ]}
    >
      {/* Decorative background glow circles */}
      <View style={[styles.decorCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
      <View style={[styles.decorCircle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />

      {/* Card Header: Bank Name & Icon */}
      <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={(account.icon as any) || 'card-outline'}
              size={17}
              color="#FFFFFF"
            />
          </View>
          <Text style={[styles.accountName, { marginHorizontal: 8 }]}>
            {account.name}
          </Text>
        </View>

        {isSelected ? (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark" size={14} color="#00A896" />
          </View>
        ) : (
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyBadgeText}>{account.currency}</Text>
          </View>
        )}
      </View>

      {/* Card Chip & Wireless indicator */}
      <View style={[styles.chipRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.chip, { backgroundColor: chipColor }]}>
          <View style={styles.chipInner} />
        </View>
        <Ionicons
          name="wifi-outline"
          size={18}
          color="rgba(255,255,255,0.6)"
          style={{ transform: [{ rotate: isRTL ? '-90deg' : '90deg' }] }}
        />
      </View>

      {/* Masked Card Number */}
      <Text style={[styles.cardNumber, { textAlign: isRTL ? 'right' : 'left' }]}>
        {maskedNumber}
      </Text>

      {/* Balance & Subtitle */}
      <View style={[styles.balanceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={styles.balanceLabel}>{t('accounts.total_balance')}</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(account.current_balance, account.currency, { isRTL })}
          </Text>
        </View>

        <View style={styles.cardTypePill}>
          <Text style={styles.cardTypeText}>
            {account.type === 'cash'
              ? t('accounts.type_cash')
              : account.type === 'ewallet'
              ? t('accounts.type_wallet')
              : t('accounts.type_bank')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 14,
    padding: 16,
    height: 175,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4
  },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60
  },
  cardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  accountName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  currencyBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  currencyBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  chipRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4
  },
  chip: {
    width: 34,
    height: 24,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)'
  },
  chipInner: {
    width: 22,
    height: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 2
  },
  cardNumber: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2
  },
  balanceRow: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 2
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '500'
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 1
  },
  cardTypePill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5
  },
  cardTypeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '600'
  }
});
