import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  Animated,
  Easing,
  TextInput,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  StatusBar as RNStatusBar
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { COUNTRIES_CURRENCIES, CountryCurrency } from '../utils/currency';
import { getCountryLanguages } from '../utils/currencyData';
import { detectRegion } from '../utils/region';
import { LANGUAGES } from '../i18n';
import {
  FONT_FAMILY,
  FONT_FAMILY_MEDIUM,
  FONT_FAMILY_SEMIBOLD,
  FONT_FAMILY_BOLD
} from '../theme/typography';

interface OnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
}

type StepId = 'setup' | 'ready';

const PRIMARY_LANGUAGES = [
  { code: 'ku', label: 'کوردی (سۆرانی)', subtitle: 'Kurdish', emoji: '☀️' },
  { code: 'ar', label: 'العربية', subtitle: 'Arabic', emoji: '🌴' },
  { code: 'en', label: 'English', subtitle: 'English', emoji: '🌐' },
  { code: 'fa', label: 'فارسی', subtitle: 'Persian', emoji: '🌸' }
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ visible, onComplete }) => {
  const { colors, radius, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isRTL = useAppStore((state) => state.isRTL);

  const {
    setCountryAndCurrency,
    setLanguage,
    completeOnboarding
  } = useAppStore();

  // Silently detect device region and language once without any intrusive alerts
  const region = useMemo(() => detectRegion(), []);

  const [stepIndex, setStepIndex] = useState(0);
  const [country, setCountry] = useState<CountryCurrency>(() => {
    return (
      COUNTRIES_CURRENCIES.find((c) => c.countryCode === region.countryCode) ??
      COUNTRIES_CURRENCIES[0]
    );
  });
  const [language, setLanguageChoice] = useState(region.language);
  const [saving, setSaving] = useState(false);

  // Country & Language modal states
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [languageQuery, setLanguageQuery] = useState('');

  // Animation values
  const fade = useRef(new Animated.Value(1)).current;
  const rise = useRef(new Animated.Value(0)).current;

  // The steps list: strictly setup -> ready (no dollar rate for onboarding)
  const steps: StepId[] = ['setup', 'ready'];
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  // Animate on step change
  useEffect(() => {
    fade.setValue(0);
    rise.setValue(14);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [stepIndex, fade, rise]);

  const countryName = (c: CountryCurrency) =>
    t(`countries.${c.countryCode}`, { defaultValue: c.countryNameEn });

  const chooseLanguage = (code: string) => {
    setLanguageChoice(code);
    void setLanguage(code);
    setLanguageModalOpen(false);
  };

  const chooseCountry = (next: CountryCurrency) => {
    setCountry(next);
    const local = getCountryLanguages(next.countryCode);
    if (!local.includes(language)) {
      chooseLanguage(local[0]);
    }
    setCountryModalOpen(false);
    setCountryQuery('');
  };

  // Search filtered countries
  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES_CURRENCIES;
    return COUNTRIES_CURRENCIES.filter(
      (c) =>
        c.countryCode.toLowerCase().includes(q) ||
        c.countryNameEn.toLowerCase().includes(q) ||
        c.currencyCode.toLowerCase().includes(q) ||
        t(`countries.${c.countryCode}`, c.countryNameEn).toLowerCase().includes(q)
    );
  }, [countryQuery, t]);

  // Search filtered languages
  const filteredLanguages = useMemo(() => {
    const q = languageQuery.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.code.toLowerCase().includes(q) ||
        l.label.toLowerCase().includes(q)
    );
  }, [languageQuery]);

  const next = async () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }
    setSaving(true);
    try {
      await setCountryAndCurrency(country.countryCode, country.currencyCode);
      await setLanguage(language);
      await completeOnboarding();
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const back = () => setStepIndex((i) => Math.max(0, i - 1));

  const topInset =
    Platform.OS === 'android'
      ? (RNStatusBar.currentHeight || insets.top || 24)
      : Math.max(insets.top, 20);

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Step Indicator Header (When on ready confirmation) */}
        {currentStep !== 'setup' && (
          <View
            style={[
              styles.navHeader,
              {
                paddingTop: topInset + 8,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                backgroundColor: colors.background
              }
            ]}
          >
            <TouchableOpacity
              onPress={back}
              hitSlop={12}
              style={[styles.navBackBtn, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Ionicons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={20}
                color={colors.textPrimary}
              />
            </TouchableOpacity>

            <View style={styles.stepDots}>
              {steps.map((s, i) => (
                <View
                  key={s}
                  style={[
                    styles.dot,
                    {
                      width: i === stepIndex ? 22 : 6,
                      backgroundColor: i === stepIndex ? colors.accent : colors.cardBorder
                    }
                  ]}
                />
              ))}
            </View>

            <View style={{ width: 38 }} />
          </View>
        )}

        <Animated.View
          style={[styles.body, { opacity: fade, transform: [{ translateY: rise }] }]}
        >
          {/* ══════════════════════════════════════════════════════════════════
              STAGE 1: SETUP (COUNTRY & CLEAN MODERN LANGUAGE CARDS)
             ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 'setup' && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 95 }}
            >
              {/* Curved Masthead Gradient Header */}
              <LinearGradient
                colors={colors.heroGradientRich}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.65, y: 1 }}
                style={[
                  styles.setupMasthead,
                  {
                    paddingTop: topInset + 20,
                    borderBottomLeftRadius: 36,
                    borderBottomRightRadius: 36
                  }
                ]}
              >
                <View style={styles.badgeGlow}>
                  <Ionicons name="sparkles" size={28} color="#FFFFFF" />
                </View>

                <Text style={styles.mastheadTitle}>{t('onboarding.welcome')}</Text>
                <Text style={styles.mastheadSub}>{t('onboarding.welcome_sub')}</Text>
              </LinearGradient>

              {/* Floating Content Area */}
              <View style={styles.floatingContent}>
                {/* 📍 Country & Currency Card */}
                <Text
                  style={[
                    styles.sectionHeading,
                    { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }
                  ]}
                >
                  📍 {t('onboarding.country_title', 'وڵات و دراو')}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setCountryModalOpen(true)}
                  style={[
                    styles.countryCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.cardBorder
                    }
                  ]}
                >
                  <View
                    style={[
                      styles.countryCardInner,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' }
                    ]}
                  >
                    <View
                      style={[
                        styles.flagBox,
                        { backgroundColor: colors.surfaceSecondary }
                      ]}
                    >
                      <Text style={styles.flagEmoji}>{country.flag}</Text>
                    </View>

                    <View
                      style={[
                        styles.countryInfo,
                        { alignItems: isRTL ? 'flex-end' : 'flex-start' }
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[styles.countryNameText, { color: colors.textPrimary }]}
                      >
                        {countryName(country)}
                      </Text>
                      <Text style={[styles.countryCurrencyText, { color: colors.textMuted }]}>
                        {country.currencyCode} · ({country.currencySymbol})
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.changePill,
                        { backgroundColor: colors.surfaceSecondary }
                      ]}
                    >
                      <Text style={[styles.changePillText, { color: colors.accent }]}>
                        {t('onboarding.change', 'گۆڕین')}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* 🌐 High-Quality Modern Language Selection */}
                <Text
                  style={[
                    styles.sectionHeading,
                    {
                      color: colors.textMuted,
                      marginTop: 22,
                      textAlign: isRTL ? 'right' : 'left'
                    }
                  ]}
                >
                  🌐 {t('onboarding.language_title', 'زمان')}
                </Text>

                <View style={styles.primaryLangsCol}>
                  {PRIMARY_LANGUAGES.map((langItem) => {
                    const isSelected = language === langItem.code;
                    return (
                      <TouchableOpacity
                        key={langItem.code}
                        activeOpacity={0.78}
                        onPress={() => chooseLanguage(langItem.code)}
                        style={[
                          styles.primaryLangCard,
                          {
                            backgroundColor: isSelected
                              ? colors.surfaceSecondary
                              : colors.surface,
                            borderColor: isSelected ? colors.accent : colors.cardBorder,
                            flexDirection: isRTL ? 'row-reverse' : 'row'
                          }
                        ]}
                      >
                        <View
                          style={[
                            styles.langIconBox,
                            {
                              backgroundColor: isSelected
                                ? colors.accent + '22'
                                : colors.surfaceSecondary
                            }
                          ]}
                        >
                          <Text style={styles.langEmoji}>{langItem.emoji}</Text>
                        </View>

                        <View
                          style={[
                            styles.langInfoCol,
                            { alignItems: isRTL ? 'flex-end' : 'flex-start' }
                          ]}
                        >
                          <Text
                            style={[
                              styles.langName,
                              {
                                color: isSelected ? colors.accent : colors.textPrimary,
                                fontFamily: isSelected ? FONT_FAMILY_BOLD : FONT_FAMILY_SEMIBOLD
                              }
                            ]}
                          >
                            {langItem.label}
                          </Text>
                          <Text style={[styles.langCode, { color: colors.textMuted }]}>
                            {langItem.subtitle} · {langItem.code.toUpperCase()}
                          </Text>
                        </View>

                        <View style={styles.langCheckWrap}>
                          {isSelected ? (
                            <View
                              style={[
                                styles.checkCircleActive,
                                { backgroundColor: colors.accent }
                              ]}
                            >
                              <Feather name="check" size={15} color="#FFFFFF" />
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.checkCircleInactive,
                                { borderColor: colors.cardBorder }
                              ]}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Other languages button */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setLanguageModalOpen(true)}
                  style={[
                    styles.otherLangsBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.cardBorder,
                      flexDirection: isRTL ? 'row-reverse' : 'row'
                    }
                  ]}
                >
                  <View style={[styles.globeChip, { backgroundColor: colors.surfaceSecondary }]}>
                    <Feather name="globe" size={17} color={colors.accent} />
                  </View>
                  <Text
                    style={[
                      styles.otherLangsText,
                      { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }
                    ]}
                  >
                    {t('onboarding.other_languages', 'زمانەکانی تر...')}
                  </Text>
                  <Ionicons
                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STAGE 2: FEATURES & READY CONFIRMATION (SABATA STYLE)
             ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 'ready' && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.centeredScroll}
            >
              <View
                style={[
                  styles.iconSquare,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }
                ]}
              >
                <Feather name="check-circle" size={34} color={colors.accent} />
              </View>

              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                {t('onboarding.ready')}
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                {t('onboarding.privacy_note')}
              </Text>

              {/* Feature Highlights Grid */}
              <View style={styles.featureCardsCol}>
                <View
                  style={[
                    styles.featureItemCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.cardBorder,
                      flexDirection: isRTL ? 'row-reverse' : 'row'
                    }
                  ]}
                >
                  <View
                    style={[
                      styles.featureIconBadge,
                      { backgroundColor: colors.surfaceSecondary }
                    ]}
                  >
                    <Ionicons name="wallet-outline" size={20} color={colors.accent} />
                  </View>
                  <View
                    style={[
                      styles.featureTextCol,
                      { alignItems: isRTL ? 'flex-end' : 'flex-start' }
                    ]}
                  >
                    <Text style={[styles.featureItemTitle, { color: colors.textPrimary }]}>
                      {t('onboarding.feature_tx_title')}
                    </Text>
                    <Text style={[styles.featureItemBody, { color: colors.textMuted }]}>
                      {t('onboarding.feature_tx_body')}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.featureItemCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.cardBorder,
                      flexDirection: isRTL ? 'row-reverse' : 'row'
                    }
                  ]}
                >
                  <View
                    style={[
                      styles.featureIconBadge,
                      { backgroundColor: colors.surfaceSecondary }
                    ]}
                  >
                    <Ionicons name="pie-chart-outline" size={20} color={colors.accent} />
                  </View>
                  <View
                    style={[
                      styles.featureTextCol,
                      { alignItems: isRTL ? 'flex-end' : 'flex-start' }
                    ]}
                  >
                    <Text style={[styles.featureItemTitle, { color: colors.textPrimary }]}>
                      {t('onboarding.feature_budget_title')}
                    </Text>
                    <Text style={[styles.featureItemBody, { color: colors.textMuted }]}>
                      {t('onboarding.feature_budget_body')}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.featureItemCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.cardBorder,
                      flexDirection: isRTL ? 'row-reverse' : 'row'
                    }
                  ]}
                >
                  <View
                    style={[
                      styles.featureIconBadge,
                      { backgroundColor: colors.surfaceSecondary }
                    ]}
                  >
                    <Ionicons name="people-outline" size={20} color={colors.accent} />
                  </View>
                  <View
                    style={[
                      styles.featureTextCol,
                      { alignItems: isRTL ? 'flex-end' : 'flex-start' }
                    ]}
                  >
                    <Text style={[styles.featureItemTitle, { color: colors.textPrimary }]}>
                      {t('onboarding.feature_debt_title')}
                    </Text>
                    <Text style={[styles.featureItemBody, { color: colors.textMuted }]}>
                      {t('onboarding.feature_debt_body')}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.featureItemCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.cardBorder,
                      flexDirection: isRTL ? 'row-reverse' : 'row'
                    }
                  ]}
                >
                  <View
                    style={[
                      styles.featureIconBadge,
                      { backgroundColor: colors.surfaceSecondary }
                    ]}
                  >
                    <Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} />
                  </View>
                  <View
                    style={[
                      styles.featureTextCol,
                      { alignItems: isRTL ? 'flex-end' : 'flex-start' }
                    ]}
                  >
                    <Text style={[styles.featureItemTitle, { color: colors.textPrimary }]}>
                      {t('onboarding.offline_title', 'پارێزراو و ئۆفلاین')}
                    </Text>
                    <Text style={[styles.featureItemBody, { color: colors.textMuted }]}>
                      {t(
                        'onboarding.offline_body',
                        'تەواوی داتاکانت تەنها لەسەر ئەم مۆبایلە دەمێننەوە و بێ ئینتەرنێت کاردەکات'
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Summary Overview Card */}
              <View
                style={[
                  styles.summaryBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.cardBorder
                  }
                ]}
              >
                <View
                  style={[
                    styles.summaryRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' }
                  ]}
                >
                  <Text style={[styles.summaryKey, { color: colors.textMuted }]}>
                    {t('settings.country')}
                  </Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                    {country.flag}  {countryName(country)}
                  </Text>
                </View>

                <View style={[styles.hairline, { backgroundColor: colors.divider }]} />

                <View
                  style={[
                    styles.summaryRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' }
                  ]}
                >
                  <Text style={[styles.summaryKey, { color: colors.textMuted }]}>
                    {t('common.currency')}
                  </Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                    {country.currencyCode} ({country.currencySymbol})
                  </Text>
                </View>

                <View style={[styles.hairline, { backgroundColor: colors.divider }]} />

                <View
                  style={[
                    styles.summaryRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' }
                  ]}
                >
                  <Text style={[styles.summaryKey, { color: colors.textMuted }]}>
                    {t('settings.language')}
                  </Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                    {LANGUAGES.find((l) => l.code === language)?.label ?? language}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════════
            STICKY BOTTOM ACTION BUTTON (SABATA GRADIENT PILL)
           ══════════════════════════════════════════════════════════════════ */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.cardBorder,
              paddingBottom: Math.max(insets.bottom, 16) + 6
            }
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={next}
            disabled={saving}
            style={{ opacity: saving ? 0.5 : 1 }}
          >
            <LinearGradient
              colors={[colors.heroGradient[0], colors.heroGradient[2]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.ctaButton, { shadowColor: colors.accent }]}
            >
              <Text style={styles.ctaButtonText}>
                {saving
                  ? t('common.please_wait')
                  : currentStep === 'ready'
                  ? t('onboarding.enter_app', 'بڕۆ ناو ئەپەکە')
                  : t('common.continue', 'بەردەوام بە')}
              </Text>
              <Ionicons
                name={isRTL ? 'arrow-back' : 'arrow-forward'}
                size={18}
                color="#FFFFFF"
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            COUNTRY SELECTION BOTTOM SHEET MODAL
           ══════════════════════════════════════════════════════════════════ */}
        <Modal
          visible={countryModalOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setCountryModalOpen(false)}
        >
          <View style={[styles.sheetRoot, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.cardBorder }]} />
              <View
                style={[
                  styles.sheetHeaderRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' }
                ]}
              >
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                  {t('onboarding.country_title', 'وڵات و دراو')}
                </Text>
                <TouchableOpacity
                  onPress={() => setCountryModalOpen(false)}
                  style={[styles.sheetCloseBtn, { backgroundColor: colors.surfaceSecondary }]}
                >
                  <Ionicons name="close" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.sheetSearchBar,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.cardBorder,
                    flexDirection: isRTL ? 'row-reverse' : 'row'
                  }
                ]}
              >
                <Ionicons name="search" size={17} color={colors.textMuted} />
                <TextInput
                  value={countryQuery}
                  onChangeText={setCountryQuery}
                  placeholder={t('onboarding.search_country', 'گەڕان بەدوای وڵات یان دراو...')}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.sheetSearchInput,
                    { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }
                  ]}
                />
                {countryQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setCountryQuery('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.countryCode}
              contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = country.countryCode === item.countryCode;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => chooseCountry(item)}
                    style={[
                      styles.countryRowItem,
                      {
                        backgroundColor: isSelected
                          ? colors.surfaceSecondary
                          : colors.surface,
                        borderColor: isSelected ? colors.accent : colors.cardBorder,
                        flexDirection: isRTL ? 'row-reverse' : 'row'
                      }
                    ]}
                  >
                    <Text style={styles.sheetFlagEmoji}>{item.flag}</Text>
                    <View
                      style={[
                        styles.countryRowTextCol,
                        { alignItems: isRTL ? 'flex-end' : 'flex-start' }
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.countryRowName,
                          {
                            color: colors.textPrimary,
                            fontFamily: isSelected ? FONT_FAMILY_BOLD : FONT_FAMILY_MEDIUM
                          }
                        ]}
                      >
                        {countryName(item)}
                      </Text>
                      <Text style={[styles.countryRowCurr, { color: colors.textMuted }]}>
                        {item.currencyCode} · ({item.currencySymbol})
                      </Text>
                    </View>

                    {isSelected && (
                      <Feather name="check" size={19} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Modal>

        {/* ══════════════════════════════════════════════════════════════════
            ALL LANGUAGES SELECTION BOTTOM SHEET MODAL
           ══════════════════════════════════════════════════════════════════ */}
        <Modal
          visible={languageModalOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setLanguageModalOpen(false)}
        >
          <View style={[styles.sheetRoot, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.cardBorder }]} />
              <View
                style={[
                  styles.sheetHeaderRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' }
                ]}
              >
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                  {t('onboarding.language_title', 'زمان')}
                </Text>
                <TouchableOpacity
                  onPress={() => setLanguageModalOpen(false)}
                  style={[styles.sheetCloseBtn, { backgroundColor: colors.surfaceSecondary }]}
                >
                  <Ionicons name="close" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.sheetSearchBar,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.cardBorder,
                    flexDirection: isRTL ? 'row-reverse' : 'row'
                  }
                ]}
              >
                <Ionicons name="search" size={17} color={colors.textMuted} />
                <TextInput
                  value={languageQuery}
                  onChangeText={setLanguageQuery}
                  placeholder={t('common.search', 'گەڕان...')}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.sheetSearchInput,
                    { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }
                  ]}
                />
                {languageQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setLanguageQuery('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <FlatList
              data={filteredLanguages}
              keyExtractor={(item) => item.code}
              contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = language === item.code;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => chooseLanguage(item.code)}
                    style={[
                      styles.countryRowItem,
                      {
                        backgroundColor: isSelected
                          ? colors.surfaceSecondary
                          : colors.surface,
                        borderColor: isSelected ? colors.accent : colors.cardBorder,
                        flexDirection: isRTL ? 'row-reverse' : 'row'
                      }
                    ]}
                  >
                    <View
                      style={[
                        styles.langIconBox,
                        { backgroundColor: isSelected ? colors.accent + '22' : colors.surfaceSecondary }
                      ]}
                    >
                      <Feather name="globe" size={18} color={isSelected ? colors.accent : colors.textMuted} />
                    </View>
                    <View
                      style={[
                        styles.countryRowTextCol,
                        { alignItems: isRTL ? 'flex-end' : 'flex-start' }
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.countryRowName,
                          {
                            color: colors.textPrimary,
                            fontFamily: isSelected ? FONT_FAMILY_BOLD : FONT_FAMILY_MEDIUM
                          }
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={[styles.countryRowCurr, { color: colors.textMuted }]}>
                        {item.code.toUpperCase()}
                      </Text>
                    </View>

                    {isSelected && (
                      <Feather name="check" size={19} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  navHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  navBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  dot: {
    height: 6,
    borderRadius: 3
  },
  body: {
    flex: 1
  },

  /* Setup Masthead */
  setupMasthead: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeGlow: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  mastheadTitle: {
    fontSize: 26,
    fontFamily: FONT_FAMILY_BOLD,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5
  },
  mastheadSub: {
    fontSize: 14,
    fontFamily: FONT_FAMILY_MEDIUM,
    color: '#FFFFFF',
    opacity: 0.88,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
    paddingHorizontal: 10
  },

  /* Floating Card Area */
  floatingContent: {
    marginTop: -26,
    paddingHorizontal: 18
  },
  sectionHeading: {
    fontSize: 13,
    fontFamily: FONT_FAMILY_BOLD,
    marginBottom: 8,
    paddingHorizontal: 4,
    letterSpacing: 0.2
  },

  /* Country Card */
  countryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 13,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  countryCardInner: {
    alignItems: 'center',
    gap: 12
  },
  flagBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  flagEmoji: {
    fontSize: 26
  },
  countryInfo: {
    flex: 1
  },
  countryNameText: {
    fontSize: 16.5,
    fontFamily: FONT_FAMILY_BOLD
  },
  countryCurrencyText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY_MEDIUM,
    marginTop: 2
  },
  changePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14
  },
  changePillText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY_BOLD
  },

  /* Modern Primary Language Cards */
  primaryLangsCol: {
    gap: 8
  },
  primaryLangCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 12
  },
  langIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  langEmoji: {
    fontSize: 21
  },
  langInfoCol: {
    flex: 1
  },
  langName: {
    fontSize: 16
  },
  langCode: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY_MEDIUM,
    marginTop: 2
  },
  langCheckWrap: {
    paddingHorizontal: 4
  },
  checkCircleActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkCircleInactive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8
  },

  /* Other Languages Button */
  otherLangsBtn: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 10
  },
  globeChip: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center'
  },
  otherLangsText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT_FAMILY_SEMIBOLD
  },

  /* Centered Step Layouts */
  centeredScroll: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 110,
    alignItems: 'center'
  },
  iconSquare: {
    width: 66,
    height: 66,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  stepTitle: {
    fontSize: 23,
    fontFamily: FONT_FAMILY_BOLD,
    textAlign: 'center',
    letterSpacing: -0.4
  },
  stepSubtitle: {
    fontSize: 13.5,
    fontFamily: FONT_FAMILY_MEDIUM,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 24,
    paddingHorizontal: 12
  },

  /* Feature Highlight Cards */
  featureCardsCol: {
    width: '100%',
    gap: 10,
    marginBottom: 20
  },
  featureItemCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    alignItems: 'center',
    gap: 12
  },
  featureIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  featureTextCol: {
    flex: 1
  },
  featureItemTitle: {
    fontSize: 14.5,
    fontFamily: FONT_FAMILY_BOLD
  },
  featureItemBody: {
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    lineHeight: 18,
    marginTop: 2
  },

  /* Summary Box */
  summaryBox: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  summaryRow: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  summaryKey: {
    fontSize: 13,
    fontFamily: FONT_FAMILY_MEDIUM
  },
  summaryVal: {
    fontSize: 13.5,
    fontFamily: FONT_FAMILY_BOLD
  },
  hairline: {
    height: StyleSheet.hairlineWidth
  },

  /* Sticky Bottom Bar */
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1
  },
  ctaButton: {
    height: 52,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONT_FAMILY_BOLD
  },

  /* Modal Sheet */
  sheetRoot: {
    flex: 1
  },
  sheetHeader: {
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 12
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14
  },
  sheetHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY_BOLD
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sheetSearchBar: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT_FAMILY,
    padding: 0
  },
  countryRowItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
    marginBottom: 8
  },
  sheetFlagEmoji: {
    fontSize: 24
  },
  countryRowTextCol: {
    flex: 1
  },
  countryRowName: {
    fontSize: 15
  },
  countryRowCurr: {
    fontSize: 12,
    fontFamily: FONT_FAMILY_MEDIUM,
    marginTop: 2
  }
});
