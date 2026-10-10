import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useAppStore } from '../../store/useAppStore';

export interface SegmentOption<T extends string> {
  value: T;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  selectedIcon?: keyof typeof Ionicons.glyphMap;
  badge?: number | string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  iconOnly?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
  iconOnly = false
}: SegmentedControlProps<T>) {
  const { colors, typography, radius } = useTheme();
  const isRTL = useAppStore((state) => state.isRTL);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSecondary,
          borderRadius: radius.md,
          flexDirection: isRTL ? 'row-reverse' : 'row'
        }
      ]}
    >
      {options.map((opt) => {
        const isSelected = opt.value === selected;
        const iconName = isSelected ? (opt.selectedIcon || opt.icon) : opt.icon;

        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.7}
            onPress={() => onSelect(opt.value)}
            accessibilityLabel={opt.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.segment,
              iconOnly && styles.iconSegment,
              {
                backgroundColor: isSelected ? colors.surface : 'transparent',
                borderRadius: radius.sm,
                shadowColor: isSelected ? colors.shadowColor || '#000' : 'transparent',
                shadowOpacity: isSelected ? 0.08 : 0,
                shadowRadius: 3,
                elevation: isSelected ? 2 : 0
              }
            ]}
          >
            {iconName && (
              <Ionicons
                name={iconName}
                size={iconOnly ? 21 : 16}
                color={isSelected ? colors.accent : colors.textSecondary}
              />
            )}
            {!iconOnly && opt.label ? (
              <Text
                style={[
                  typography.caption,
                  {
                    color: isSelected ? colors.textPrimary : colors.textSecondary,
                    fontWeight: isSelected ? '600' : '500',
                    marginLeft: iconName && !isRTL ? 6 : 0,
                    marginRight: iconName && isRTL ? 6 : 0
                  }
                ]}
              >
                {opt.label}
              </Text>
            ) : null}
            {opt.badge !== undefined && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: isSelected ? colors.accent : colors.divider }
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary }
                  ]}
                >
                  {opt.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 3
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  iconSegment: {
    paddingVertical: 10
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700'
  }
});
