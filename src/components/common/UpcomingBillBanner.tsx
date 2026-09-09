import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { Reminder } from '../../db/schema';
import { formatCurrency } from '../../utils/currency';
import { useTranslation } from 'react-i18next';

interface UpcomingBillBannerProps {
  reminders: Reminder[];
  onPress: () => void;
}

export const UpcomingBillBanner: React.FC<UpcomingBillBannerProps> = ({
  reminders,
  onPress
}) => {
  const { t } = useTranslation();
  const { colors, typography, radius } = useTheme();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);

  // Filter unpaid reminders
  const unpaid = (reminders || []).filter((r) => !r.is_paid);

  if (unpaid.length === 0) {
    return null;
  }

  // Find the nearest upcoming reminder
  const now = new Date();
  const currentDay = now.getDate();

  const sorted = [...unpaid].sort((a, b) => {
    const diffA = (a.due_day - currentDay + 31) % 31;
    const diffB = (b.due_day - currentDay + 31) % 31;
    return diffA - diffB;
  });

  const nextBill = sorted[0];
  const diffDays = nextBill.due_day - currentDay;

  let timeText = '';
  let isOverdue = false;

  if (diffDays < 0) {
    isOverdue = true;
    timeText = `${Math.abs(diffDays)} ڕۆژە بەسەرچووە!`;
  } else if (diffDays === 0) {
    timeText = t('reminders.due_today_bang');
  } else if (diffDays === 1) {
    timeText = t('reminders.due_tomorrow_bang');
  } else {
    timeText = `${diffDays} ڕۆژی ماوە!`;
  }

  const badgeColor = isOverdue ? colors.danger : colors.warning;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.bannerContainer,
        {
          backgroundColor: isOverdue ? colors.expenseMuted : colors.warningMuted,
          borderColor: isOverdue ? colors.danger + '40' : colors.warning + '40',
          borderRadius: 8,
          flexDirection: isRTL ? 'row-reverse' : 'row'
        }
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: badgeColor }]}>
        <Ionicons
          name={isOverdue ? 'alert' : 'time-outline'}
          size={16}
          color="#FFFFFF"
        />
      </View>

      <View style={[styles.textWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
          <Text style={[styles.titleText, { color: colors.textPrimary, marginHorizontal: 4 }]}>
            موعدی {nextBill.title}
          </Text>
          <View style={[styles.timeChip, { backgroundColor: badgeColor }]}>
            <Text style={styles.timeChipText}>{timeText}</Text>
          </View>
        </View>

        <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
          بڕی: {formatCurrency(nextBill.amount, nextBill.currency || primaryCurrency, { isRTL })}
          {unpaid.length > 1 && ` • (${unpaid.length - 1} پارەدانی تر ماوە)`}
        </Text>
      </View>

      <Ionicons
        name={isRTL ? 'chevron-back' : 'chevron-forward'}
        size={18}
        color={colors.textMuted}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1.5
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  textWrap: {
    flex: 1,
    marginHorizontal: 10
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700'
  },
  timeChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  timeChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700'
  },
  subtitleText: {
    fontSize: 11,
    marginTop: 2
  }
});
