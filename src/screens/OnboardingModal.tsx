import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, FlatList, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { COUNTRIES_CURRENCIES, CountryCurrency } from '../utils/currency';
import { Button } from '../components/common/Button';

interface OnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ visible, onComplete }) => {
  const { colors, typography, radius } = useTheme();
  const { t, i18n } = useTranslation();
  const { setCountryAndCurrency, completeOnboarding } = useAppStore();

  const [selectedCountry, setSelectedCountry] = useState<CountryCurrency>(COUNTRIES_CURRENCIES[0]);

  const handleFinish = async () => {
    await setCountryAndCurrency(selectedCountry.countryCode, selectedCountry.currencyCode);
    await completeOnboarding();
    onComplete();
  };

  const getCountryName = (c: CountryCurrency) => {
    if (i18n.language === 'ku') return c.countryNameKu;
    if (i18n.language === 'ar') return c.countryNameAr;
    return c.countryNameEn;
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[typography.titleLarge, { color: colors.textPrimary, textAlign: 'center' }]}>
            {t('onboarding.welcome')}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
            {t('onboarding.subtitle')}
          </Text>
        </View>

        <View style={styles.countrySection}>
          <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 4 }]}>
            {t('onboarding.select_country')}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 12 }]}>
            {t('onboarding.select_country_desc')}
          </Text>

          <FlatList
            data={COUNTRIES_CURRENCIES}
            keyExtractor={(i) => i.countryCode}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedCountry.countryCode === item.countryCode;
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSelectedCountry(item)}
                  style={[
                    styles.countryItem,
                    {
                      backgroundColor: isSelected ? colors.surfaceSecondary : colors.surface,
                      borderColor: isSelected ? colors.accent : colors.cardBorder,
                      borderRadius: radius.md
                    }
                  ]}
                >
                  <Text style={{ fontSize: 24, marginRight: 12 }}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodySemibold, { color: colors.textPrimary }]}>
                      {getCountryName(item)}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      {item.currencyCode} ({item.currencySymbol})
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: colors.accent }]}>
                      <Text style={{ color: colors.textInverse, fontSize: 12, fontWeight: '700' }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <View style={styles.footer}>
          <Button title={t('onboarding.get_started')} onPress={handleFinish} variant="primary" />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 54,
    paddingBottom: 24,
    paddingHorizontal: 20
  },
  header: {
    marginBottom: 20
  },
  countrySection: {
    flex: 1
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 4,
    borderWidth: 1
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center'
  },
  footer: {
    paddingTop: 12
  }
});
