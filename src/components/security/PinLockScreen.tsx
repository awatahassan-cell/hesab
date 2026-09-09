import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { FONT_FAMILY, FONT_FAMILY_MEDIUM, FONT_FAMILY_BOLD } from '../../theme/typography';

interface PinLockScreenProps {
  onSuccess: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onSuccess }) => {
  const { colors, typography } = useTheme();
  const { t } = useTranslation();
  const { pinCode, isBiometricsEnabled } = useAppStore();
  const [enteredPin, setEnteredPin] = useState('');
  const [errorShake, setErrorShake] = useState(false);

  // Prompt biometrics on mount if enabled
  useEffect(() => {
    if (isBiometricsEnabled) {
      handleBiometricAuth();
    }
  }, [isBiometricsEnabled]);

  const handleBiometricAuth = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: t('security.unlock_with_biometrics'),
          cancelLabel: t('common.cancel'),
          fallbackLabel: pinCode ? t('security.pin_code') : undefined
        });

        if (result.success) {
          onSuccess();
        }
      }
    } catch (e) {
      console.log('Biometric error', e);
    }
  };

  const handleDigit = (digit: string) => {
    if (enteredPin.length < 4) {
      const next = enteredPin + digit;
      setEnteredPin(next);

      if (next.length === 4) {
        if (next === pinCode) {
          onSuccess();
        } else {
          setErrorShake(true);
          setTimeout(() => {
            setEnteredPin('');
            setErrorShake(false);
          }, 600);
        }
      }
    }
  };

  const handleDelete = () => {
    setEnteredPin(enteredPin.slice(0, -1));
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const insets = useSafeAreaInsets();
  const topSafeInset = Platform.OS === 'android'
    ? Math.max(RNStatusBar.currentHeight || 0, insets.top, 48) + 12
    : Math.max(insets.top, 20) + 12;
  const bottomSafePadding = Platform.OS === 'android'
    ? Math.max(insets.bottom, 48) + 16
    : Math.max(insets.bottom, 16) + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topSafeInset, paddingBottom: bottomSafePadding }]}>
      <View style={styles.header}>
        <View style={[styles.lockIcon, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="lock-closed" size={32} color={colors.accent} />
        </View>
        <Text style={[styles.titleText, { color: colors.textPrimary }]}>
          {pinCode ? t('security.enter_pin') : t('security.protected_by_biometrics')}
        </Text>
        <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
          {pinCode ? t('security.enter_4_digits') : t('security.unlock_with_biometrics')}
        </Text>
      </View>

      {/* If PIN is enabled, show 4 PIN Dots */}
      {pinCode ? (
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((i) => {
            const filled = i < enteredPin.length;
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
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBiometricAuth}
          style={[styles.bioOnlyBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        >
          <Ionicons name="finger-print-outline" size={54} color={colors.accent} />
          <Text style={[styles.bioOnlyText, { color: colors.textPrimary }]}>
            {t('security.touch_sensor')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Numeric Keypad if PIN is set */}
      {pinCode && (
        <View style={styles.keypad}>
          <View style={styles.row}>
            {digits.slice(0, 3).map((d) => (
              <TouchableOpacity
                key={d}
                activeOpacity={0.6}
                onPress={() => handleDigit(d)}
                style={[styles.key, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
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
                style={[styles.key, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
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
                style={[styles.key, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              >
                <Text style={[styles.keyText, { color: colors.textPrimary }]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            {isBiometricsEnabled ? (
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={handleBiometricAuth}
                style={[styles.key, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}
              >
                <Ionicons name="finger-print-outline" size={28} color={colors.accent} />
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyKey} />
            )}

            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => handleDigit('0')}
              style={[styles.key, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 48,
    paddingHorizontal: 24
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  lockIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 18,
    textAlign: 'center',
  },
  subtitleText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7
  },
  bioOnlyBtn: {
    paddingVertical: 32,
    paddingHorizontal: 40,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  bioOnlyText: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 15,
    fontWeight: '600',
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    gap: 14
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14
  },
  key: {
    flex: 1,
    aspectRatio: 1.25,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyKey: {
    flex: 1
  },
  keyText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 22,
    fontWeight: '700',
  },
});
