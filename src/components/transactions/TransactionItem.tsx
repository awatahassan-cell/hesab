import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Transaction } from '../../db/schema';
import { useTheme } from '../../theme';
import { formatCurrency } from '../../utils/currency';
import { formatTransactionDate, formatTime } from '../../utils/dates';
import { useAppStore } from '../../store/useAppStore';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  showDate?: boolean;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
  showDate = false
}) => {
  const { colors, typography, radius } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);

  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';

  const amountColor = isIncome
    ? colors.income
    : isTransfer
    ? colors.transfer
    : colors.expense;

  const prefix = isIncome ? '+' : isTransfer ? '⇄ ' : '-';

  // Category name or transfer label
  let title = transaction.category_custom_name || '';
  if (!title && transaction.category_name_key) {
    title = t(`categories.names.${transaction.category_name_key}`, transaction.category_name_key);
  }
  if (isTransfer) {
    title = t('types.transfer');
  }

  const categoryColor = transaction.category_color || (isTransfer ? colors.transfer : colors.textMuted);
  const iconName = (transaction.category_icon || (isTransfer ? 'swap-horizontal-outline' : 'pricetag-outline')) as keyof typeof Ionicons.glyphMap;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder,
          borderRadius: radius.md,
          flexDirection: isRTL ? 'row-reverse' : 'row'
        }
      ]}
    >
      {/* Category Icon */}
      <View style={[styles.iconBox, { backgroundColor: categoryColor + '18', borderRadius: radius.md }]}>
        <Ionicons name={iconName} size={20} color={categoryColor} />
      </View>

      {/* Details */}
      <View style={[styles.details, { alignItems: isRTL ? 'flex-end' : 'flex-start', marginHorizontal: 12 }]}>
        <Text style={[typography.bodySemibold, { color: colors.textPrimary }]} numberOfLines={1}>
          {title || t('types.expense')}
        </Text>

        <View style={[styles.subRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {transaction.account_name && (
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {transaction.account_name}
              {isTransfer && transaction.to_account_name ? ` → ${transaction.to_account_name}` : ''}
            </Text>
          )}

          {transaction.note ? (
            <Text style={[typography.caption, { color: colors.textSecondary, marginHorizontal: 4 }]} numberOfLines={1}>
              • {transaction.note}
            </Text>
          ) : null}
        </View>

        {showDate && (
          <Text style={[typography.captionSmall, { color: colors.textMuted, marginTop: 2 }]}>
            {formatTransactionDate(transaction.date_time, {
              today: t('common.today'),
              yesterday: t('common.yesterday')
            })}{' '}
            {formatTime(transaction.date_time)}
          </Text>
        )}
      </View>

      {/* Amount & Receipt indicator */}
      <View style={[styles.amountArea, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
        <Text style={[typography.tabularNumber, { color: amountColor }]}>
          {prefix}{formatCurrency(transaction.amount, transaction.currency, { isRTL })}
        </Text>

        {transaction.receipt_uri && (
          <View style={styles.receiptBadge}>
            <Ionicons name="receipt-outline" size={13} color={colors.textMuted} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2
  },
  iconBox: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center'
  },
  details: {
    flex: 1
  },
  subRow: {
    alignItems: 'center',
    marginTop: 2
  },
  amountArea: {
    justifyContent: 'center'
  },
  receiptBadge: {
    marginTop: 2
  }
});
