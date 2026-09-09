import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useAppStore } from '../../store/useAppStore';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onBack, rightAction }) => {
  const { colors, typography, spacing } = useTheme();
  const isRTL = useAppStore((state) => state.isRTL);

  return (
    <View style={[styles.container, { borderBottomColor: colors.cardBorder, backgroundColor: colors.surface }]}>
      <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons
              name={isRTL ? 'chevron-forward-outline' : 'chevron-back-outline'}
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        )}

        <View style={[styles.titleContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[typography.titleMedium, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle && (
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>{subtitle}</Text>
          )}
        </View>

        {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  row: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: {
    padding: 6,
    marginRight: 8
  },
  titleContainer: {
    flex: 1
  },
  rightAction: {
    marginLeft: 8
  }
});
