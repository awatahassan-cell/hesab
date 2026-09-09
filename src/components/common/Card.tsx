import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { elevation } from '../../theme/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Quieter fill, for cards nested inside another surface. */
  subtle?: boolean;
  /** Opaque surface instead of the translucent glass — for modals and sheets. */
  solid?: boolean;
}

/**
 * A frosted panel floating over the aurora wash.
 *
 * The fill is translucent so the colour behind it shows through; the light
 * top edge is what separates the panel from the ground, and the shadow is
 * what keeps it from dissolving into a light background.
 */
export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  subtle = false,
  solid = false
}) => {
  const { colors, radius, spacing } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: solid
      ? colors.surface
      : subtle
      ? colors.glass
      : colors.glassStrong,
    borderColor: colors.glassEdge,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...elevation.md(colors.shadowColor)
  };

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={[cardStyle, style]}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({});
