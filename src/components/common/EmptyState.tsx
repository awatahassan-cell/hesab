import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'file-tray-outline',
  title,
  description,
  actionLabel,
  onAction
}) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.xxl }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.surfaceSecondary }]}>
        <Ionicons name={icon} size={36} color={colors.textMuted} />
      </View>
      <Text style={[typography.titleSmall, { color: colors.textPrimary, textAlign: 'center', marginTop: 16 }]}>
        {title}
      </Text>
      <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: 6, maxWidth: 280 }]}>
        {description}
      </Text>
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="secondary"
          style={{ marginTop: 20 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
