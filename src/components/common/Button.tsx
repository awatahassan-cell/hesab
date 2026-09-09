import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon
}) => {
  const { colors, typography, radius, spacing } = useTheme();

  let bg = colors.accent;
  let textColor = colors.textInverse;
  let borderColor = 'transparent';

  if (variant === 'secondary') {
    bg = colors.surfaceSecondary;
    textColor = colors.textPrimary;
    borderColor = colors.cardBorder;
  } else if (variant === 'danger') {
    bg = colors.danger;
    textColor = '#FFFFFF';
  } else if (variant === 'ghost') {
    bg = 'transparent';
    textColor = colors.textPrimary;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: disabled ? colors.surfaceSecondary : bg,
          borderColor,
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              typography.bodySemibold,
              {
                color: disabled ? colors.textMuted : textColor,
                marginLeft: icon ? 8 : 0
              },
              textStyle
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 48
  }
});
