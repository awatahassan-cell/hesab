import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface BadgeProps {
  label: string;
  variant?: 'expense' | 'income' | 'transfer' | 'neutral' | 'warning' | 'success';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral' }) => {
  const { colors, typography, radius } = useTheme();

  let bg = colors.surfaceSecondary;
  let text = colors.textSecondary;

  if (variant === 'expense') {
    bg = colors.expenseMuted;
    text = colors.expense;
  } else if (variant === 'income') {
    bg = colors.incomeMuted;
    text = colors.income;
  } else if (variant === 'transfer') {
    bg = colors.transferMuted;
    text = colors.transfer;
  } else if (variant === 'warning') {
    bg = colors.warningMuted;
    text = colors.warning;
  } else if (variant === 'success') {
    bg = colors.incomeMuted;
    text = colors.income;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: radius.round }]}>
      <Text style={[typography.captionSmall, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
