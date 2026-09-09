import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { useAppStore } from '../../store/useAppStore';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  badge?: number | string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, selected, onSelect }: SegmentedControlProps<T>) {
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
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.7}
            onPress={() => onSelect(opt.value)}
            style={[
              styles.segment,
              {
                backgroundColor: isSelected ? colors.surface : 'transparent',
                borderRadius: radius.sm,
                shadowColor: isSelected ? '#000' : 'transparent',
                shadowOpacity: isSelected ? 0.05 : 0,
                shadowRadius: 2,
                elevation: isSelected ? 1 : 0
              }
            ]}
          >
            <Text
              style={[
                typography.caption,
                {
                  color: isSelected ? colors.textPrimary : colors.textSecondary,
                  fontWeight: isSelected ? '600' : '500'
                }
              ]}
            >
              {opt.label}
            </Text>
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
    justifyContent: 'center'
  }
});
