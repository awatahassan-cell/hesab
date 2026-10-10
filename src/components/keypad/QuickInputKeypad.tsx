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
  const { colors } = useTheme();
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
      {/* Quick Increment Pills — 100% Borderless */}
      <View style={styles.quickAddRow}>
        {!isUSD ? (
          <>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickIncrement(1000)}
              style={[styles.chip, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>+1,000</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickIncrement(5000)}
              style={[styles.chip, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>+5,000</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickIncrement(25000)}
              style={[styles.chip, { backgroundColor: colors.accentMuted }]}
            >
              <Text style={[styles.chipText, { color: colors.accent, fontWeight: '700' }]}>+25,000</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setAltMode(!altMode)}
              style={[styles.chip, styles.chipToggle, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Ionicons name="swap-horizontal" size={14} color={colors.textMuted} style={{ marginHorizontal: 2 }} />
              <Text style={[styles.chipText, { color: colors.textMuted }]}>{altMode ? '000' : '.'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickIncrement(5)}
              style={[styles.chip, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>+$5</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickIncrement(10)}
              style={[styles.chip, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>+$10</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickIncrement(50)}
              style={[styles.chip, { backgroundColor: colors.accentMuted }]}
            >
              <Text style={[styles.chipText, { color: colors.accent, fontWeight: '700' }]}>+$50</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setAltMode(!altMode)}
              style={[styles.chip, styles.chipToggle, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Ionicons name="swap-horizontal" size={14} color={colors.textMuted} style={{ marginHorizontal: 2 }} />
              <Text style={[styles.chipText, { color: colors.textMuted }]}>{altMode ? '.' : '000'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Modern Borderless Keypad Grid */}
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
                  activeOpacity={0.55}
                  onPress={() => handlePress(k)}
                  onLongPress={isBackspace && onClear ? onClear : undefined}
                  style={[
                    styles.key,
                    {
                      backgroundColor: isBackspace
                        ? colors.surfaceSecondary
                        : isThousand
                        ? colors.accentMuted
                        : isDot
                        ? colors.surfaceSecondary
                        : colors.surface
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
                          fontSize: isThousand ? 19 : isDot ? 28 : 25
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
    paddingHorizontal: 2,
    flex: 1,
    justifyContent: 'center'
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
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2
      },
      android: {
        elevation: 0
      }
    })
  },
  chipToggle: {
    minWidth: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  chipText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums']
  },
  grid: {
    gap: 9,
    flex: 1,
    justifyContent: 'space-between'
  },
  row: {
    flexDirection: 'row',
    gap: 9,
    flex: 1,
    minHeight: 52,
    maxHeight: 64
  },
  key: {
    flex: 1,
    height: '100%',
    minHeight: 52,
    maxHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4
      },
      android: {
        elevation: 0
      }
    })
  },
  keyText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontWeight: '700',
    fontVariant: ['tabular-nums']
  }
});
