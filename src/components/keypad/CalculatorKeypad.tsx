import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { evaluateExpression, formatExpressionPreview } from '../../utils/calculator';
import { useAppStore } from '../../store/useAppStore';

interface CalculatorKeypadProps {
  value: string;
  onChange: (newValue: string) => void;
  onConfirm?: () => void;
  currencySymbol?: string;
}

export const CalculatorKeypad: React.FC<CalculatorKeypadProps> = ({
  value,
  onChange,
  onConfirm,
  currencySymbol = 'IQD'
}) => {
  const { colors, typography, radius } = useTheme();
  const isRTL = useAppStore((state) => state.isRTL);

  const preview = formatExpressionPreview(value);
  const hasOperator = /[+\-*\/]/.test(value);

  const handlePress = (char: string) => {
    if (char === 'C') {
      onChange('0');
      return;
    }
    if (char === '⌫') {
      if (value.length <= 1) {
        onChange('0');
      } else {
        onChange(value.slice(0, -1));
      }
      return;
    }
    if (char === '=') {
      const evaluated = evaluateExpression(value);
      if (evaluated !== null) {
        onChange(evaluated.toString());
      }
      return;
    }

    if (value === '0' && !['+', '-', '*', '/', '.'].includes(char)) {
      onChange(char);
    } else {
      onChange(value + char);
    }
  };

  const keys = [
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '-'],
    ['C', '0', '.', '+']
  ];

  const mapDisplayToChar = (k: string) => {
    if (k === '÷') return '/';
    if (k === '×') return '*';
    return k;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.xl }]}>
      {/* Display & Math Preview */}
      <View style={styles.displayArea}>
        <View style={[styles.amountRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[typography.hero, { color: colors.textPrimary }]}>
            {value || '0'}
          </Text>
          <Text style={[typography.titleMedium, { color: colors.textMuted, marginHorizontal: 6 }]}>
            {currencySymbol}
          </Text>
        </View>

        {hasOperator && preview && (
          <Text style={[typography.titleSmall, { color: colors.income, marginTop: 4 }]}>
            = {preview}
          </Text>
        )}
      </View>

      {/* Grid of keys */}
      <View style={styles.grid}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((k) => {
              const isOperator = ['÷', '×', '-', '+'].includes(k);
              const isClear = k === 'C';

              return (
                <TouchableOpacity
                  key={k}
                  activeOpacity={0.6}
                  onPress={() => handlePress(mapDisplayToChar(k))}
                  style={[
                    styles.key,
                    {
                      backgroundColor: isOperator
                        ? colors.surfaceSubtle
                        : isClear
                        ? colors.surfaceSubtle
                        : colors.surface,
                      borderRadius: radius.md,
                      borderColor: colors.cardBorder
                    }
                  ]}
                >
                  <Text
                    style={[
                      typography.titleMedium,
                      {
                        color: isOperator
                          ? colors.transfer
                          : isClear
                          ? colors.danger
                          : colors.textPrimary,
                        fontWeight: '600'
                      }
                    ]}
                  >
                    {k}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Bottom utility row: Backspace and Done */}
        <View style={styles.row}>
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => handlePress('⌫')}
            style={[styles.key, { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderColor: colors.cardBorder }]}
          >
            <Ionicons name="backspace-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => handlePress('=')}
            style={[styles.key, { flex: 1, backgroundColor: colors.surfaceSubtle, borderRadius: radius.md, borderColor: colors.cardBorder }]}
          >
            <Text style={[typography.titleMedium, { color: colors.accent, fontWeight: '700' }]}>=</Text>
          </TouchableOpacity>

          {onConfirm && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onConfirm}
              style={[
                styles.key,
                {
                  flex: 2,
                  backgroundColor: colors.accent,
                  borderRadius: radius.md,
                  borderColor: 'transparent'
                }
              ]}
            >
              <Ionicons name="checkmark" size={24} color={colors.textInverse} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12
  },
  displayArea: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  amountRow: {
    alignItems: 'baseline'
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
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth
  }
});
