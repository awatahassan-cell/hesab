import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { FONT_FAMILY, FONT_FAMILY_MEDIUM, FONT_FAMILY_BOLD } from '../../theme/typography';

interface PinSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({ visible, onClose, onSuccess }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);

  const [step, setStep] = useState<1 | 2>(1);
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorText, setErrorText] = useState('');
  const [errorShake, setErrorShake] = useState(false);

  const currentEntered = step === 1 ? firstPin : confirmPin;

  const handleReset = () => {
    setStep(1);
    setFirstPin('');
    setConfirmPin('');
    setErrorText('');
    setErrorShake(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleDigit = (d: string) => {
    if (currentEntered.length >= 4) return;
    const next = currentEntered + d;
    setErrorText('');

    if (step === 1) {
      setFirstPin(next);
      if (next.length === 4) {
        setTimeout(() => {
          setStep(2);
        }, 200);
      }
    } else {
      setConfirmPin(next);
      if (next.length === 4) {
        if (next === firstPin) {
          onSuccess(next);
          handleClose();
        } else {
          setErrorShake(true);
          setErrorText('کۆدەکان یەکسان نین، دووبارە هەوڵبدەرەوە');
          setTimeout(() => {
            setStep(1);
            setFirstPin('');
            setConfirmPin('');
            setErrorShake(false);
          }, 1000);
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === 1) {
      setFirstPin(firstPin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {/* Close button */}
          <TouchableOpacity
            onPress={handleClose}
            style={[styles.closeBtn, isRTL ? { left: 16 } : { right: 16 }]}
          >
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Header Icon */}
          <View style={[styles.iconCircle, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="keypad-outline" size={32} color={colors.accent} />
          </View>

          {/* Step Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {step === 1 ? 'کۆدی نوێ داخڵ بکە' : 'دووبارە کۆدەکە داخڵ بکەرەوە'}
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {step === 1
              ? 'تکایە ٤ ژمارە بۆ کۆدی تێپەڕبوون هەڵبژێرە'
              : 'بۆ دڵنیابوونەوە هەمان ٤ ژمارە داخڵ بکەرەوە'}
          </Text>

          {/* 4 Dots indicator */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((i) => {
              const filled = i < currentEntered.length;
              return (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: errorShake
                        ? colors.danger
                        : filled
                        ? colors.accent
                        : colors.cardBorder,
                      transform: [{ scale: filled ? 1.25 : 1 }]
                    }
                  ]}
                />
              );
            })}
          </View>

          {/* Error Message */}
          {errorText ? (
            <Text style={[styles.errorMsg, { color: colors.danger }]}>{errorText}</Text>
          ) : (
            <View style={{ height: 20 }} />
          )}

          {/* Numeric Keypad */}
          <View style={styles.keypad}>
            <View style={styles.row}>
              {digits.slice(0, 3).map((d) => (
                <TouchableOpacity
                  key={d}
                  activeOpacity={0.6}
                  onPress={() => handleDigit(d)}
                  style={[styles.key, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}
                >
                  <Text style={[styles.keyText, { color: colors.textPrimary }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              {digits.slice(3, 6).map((d) => (
                <TouchableOpacity
                  key={d}
                  activeOpacity={0.6}
                  onPress={() => handleDigit(d)}
                  style={[styles.key, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}
                >
                  <Text style={[styles.keyText, { color: colors.textPrimary }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              {digits.slice(6, 9).map((d) => (
                <TouchableOpacity
                  key={d}
                  activeOpacity={0.6}
                  onPress={() => handleDigit(d)}
                  style={[styles.key, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}
                >
                  <Text style={[styles.keyText, { color: colors.textPrimary }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              <View style={styles.emptyKey} />

              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => handleDigit('0')}
                style={[styles.key, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}
              >
                <Text style={[styles.keyText, { color: colors.textPrimary }]}>0</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.6}
                onPress={handleDelete}
                style={[styles.key, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}
              >
                <Ionicons name="backspace-outline" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    padding: 8,
    zIndex: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 18,
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  errorMsg: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 13,
    height: 20,
    textAlign: 'center',
    marginBottom: 4,
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  key: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyKey: {
    flex: 1,
  },
  keyText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 22,
    fontWeight: '700',
  },
});
