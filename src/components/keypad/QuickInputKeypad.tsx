import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { FONT_FAMILY_BOLD, FONT_FAMILY_SEMIBOLD } from '../../theme/typography';

interface QuickInputKeypadProps {
  value: string;
  onChange: (newValue: string) => void;
  currency?: string;
  onQuickAdd?: (amountToAdd: number) => void;
  onClear?: () => void;
}

export const QuickInputKeypad: React.FC<QuickInputKeypadProps> = ({
  value,
  onChange,
  currency = 'IQD',
  onQuickAdd,
  onClear
}) => {
  const { colors, radius } = useTheme();
  const [altMode, setAltMode] = useState(false);

  const isUSD = currency === 'USD';
  const leftKey = isUSD ? (altMode ? '000' : '.') : (altMode ? '.' : '000');

  const handlePress = (char: string) => {
    if (char === '⌫') {
      if (!value || value.length <= 1) {
        onChange('');
      } else {
        onChange(value.slice(0, -1));
      }
      return;
    }

    if (char === '000') {
      if (!value || value === '0') {
        onChange('1000');
        return;
      }
      if (value.length < 10) {
        onChange(value + '000');
      }
      return;
    }

    if (char === '.') {
      if (value.includes('.')) return;
      if (!value) {
        onChange('0.');
      } else {
        onChange(value + '.');
      }
      return;
    }

    if (value === '0') {
      onChange(char);
    } else if (value.length < 12) {
      onChange(value + char);
    }
  };

  const handleQuickIncrement = (amt: number) => {
    const current = parseFloat(value) || 0;
    const next = current + amt;
    onChange(String(next));
    if (onQuickAdd) onQuickAdd(amt);
  };

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [leftKey, '0', '⌫']
  ];

  return (
    <View style={styles.container}>
      <View style={styles.quickAddRow}>
        {!isUSD ? (
          <>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickIncrement(1000)}
              style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>+1,000</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickIncrement(5000)}
              style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>+5,000</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickIncrement(25000)}
              style={[styles.chip, { backgroundColor: colors.accentMuted, borderColor: colors.accent + '30' }]}
            >
              <Text style={[styles.chipText, { color: colors.accent }]}>+25,000</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setAltMode(!altMode)}
              style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, minWidth: 44 }]}
            >
              <Text style={[styles.chipText, { color: colors.textMuted }]}>{altMode ? '000' : '.'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickIncrement(5)}
              style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickIncrement(10)}
              style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickIncrement(50)}
              style={[styles.chip, { backgroundColor: colors.accentMuted, borderColor: colors.accent + '30' }]}
            >
              <Text style={[styles.chipText, { color: colors.accent }]}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setAltMode(!altMode)}
              style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, minWidth: 44 }]}
            >
              <Text style={[styles.chipText, { color: colors.textMuted }]}>{altMode ? '.' : '000'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.grid}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((k) => {
              const isBackspace = k === '⌫';
              const isThousand = k === '000';
              const isDot = k === '.';

              return (
                <TouchableOpacity
                  key={k}
                  activeOpacity={0.5}
                  onPress={() => handlePress(k)}
                  onLongPress={isBackspace && onClear ? onClear : undefined}
                  style={[
                    styles.key,
                    {
                      backgroundColor: isBackspace
                        ? colors.surfaceSecondary
                        : isThousand
                        ? colors.accentMuted
                        : colors.surface,
                      borderColor: colors.cardBorder,
                      borderRadius: radius.lg
                    }
                  ]}
                >
                  {isBackspace ? (
                    <Ionicons name="backspace-outline" size={24} color={colors.expense} />
                  ) : (
                    <Text
                      style={[
                        styles.keyText,
                        {
                          color: isThousand
                            ? colors.accent
                            : isDot
                            ? colors.textSecondary
                            : colors.textPrimary,
                          fontSize: isThousand ? 19 : 24
                        }
                      ]}
                    >
                      {k}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 4,
    paddingTop: 4
  },
  quickAddRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10
  },
  chip: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth
  },
  chipText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 12,
    fontWeight: '600'
  },
  grid: {
    gap: 8
  },
  row: {
    flexDirection: 'row',
    gap: 8
  },
  key: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2
      },
      android: {
        elevation: 1
      }
    })
  },
  keyText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontWeight: '700'
  }
});
