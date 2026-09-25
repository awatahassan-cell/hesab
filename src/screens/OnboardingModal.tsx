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
  KeyboardAvoidingView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { COUNTRIES_CURRENCIES, CountryCurrency } from '../utils/currency';
import { getCountryLanguages, hasDualRate } from '../utils/currencyData';
import { per100Usd } from '../utils/currency';
import { detectRegion } from '../utils/region';
import { LANGUAGES } from '../i18n';
import { AuroraBackground } from '../components/common/AuroraBackground';
import { Icon, IconName } from '../components/icons/Icon';
import { elevation } from '../theme/spacing';
import { FONT_FAMILY, FONT_FAMILY_SEMIBOLD, FONT_FAMILY_BOLD } from '../theme/typography';

interface OnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
}

/**
 * Steps are derived, not fixed: the rate step only exists where the street
 * rate and the official one differ.
 */
type StepId = 'welcome' | 'country' | 'language' | 'rate' | 'ready';

// Keys, not text: this array is module scope, so it cannot call t() here.
const FEATURES: { icon: IconName; titleKey: string; bodyKey: string }[] = [
  {
    icon: 'wallet',
    titleKey: 'onboarding.feature_tx_title',
    bodyKey: 'onboarding.feature_tx_body'
  },
  {
    icon: 'target',
    titleKey: 'onboarding.feature_budget_title',
    bodyKey: 'onboarding.feature_budget_body'
  },
  {
    icon: 'users',
    titleKey: 'onboarding.feature_debt_title',
    bodyKey: 'onboarding.feature_debt_body'
  }
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ visible, onComplete }) => {
  const { colors, radius } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    setCountryAndCurrency,
    setLanguage,
    completeOnboarding,
    setMarketRate100USD,
    exchangeRates
  } = useAppStore();

  // The device's own region and language, read once. Onboarding shows the
  // guess rather than acting on it silently, so it can always be corrected.
  const region = useMemo(() => detectRegion(), []);

  const [index, setIndex] = useState(0);
  const [country, setCountry] = useState<CountryCurrency>(
    () =>
      COUNTRIES_CURRENCIES.find((c) => c.countryCode === region.countryCode) ??
      COUNTRIES_CURRENCIES[0]
  );
  const [language, setLanguageChoice] = useState(region.language);
  // Seeded from the table for the detected country, so the step opens valid
  // and is a confirmation rather than a form to fill in.
  const [rate, setRate] = useState(() =>
    String(per100Usd(country.currencyCode, useAppStore.getState().exchangeRates))
  );
  const [saving, setSaving] = useState(false);

  // The detected country first, so the guess is one tap to confirm rather
  // than a scroll through forty-three others.
  const countryList = useMemo(() => {
    if (!region.detected) return COUNTRIES_CURRENCIES;
    const hit = COUNTRIES_CURRENCIES.find((c) => c.countryCode === region.countryCode);
    if (!hit) return COUNTRIES_CURRENCIES;
    return [hit, ...COUNTRIES_CURRENCIES.filter((c) => c !== hit)];
  }, [region]);

  // The languages actually read in the chosen country come first; the rest
  // stay reachable for anyone the country guess does not describe.
  const languageList = useMemo(() => {
    const local = getCountryLanguages(country.countryCode);
    const ordered = [
      ...local,
      ...LANGUAGES.map((l) => l.code).filter((c) => !local.includes(c))
    ];
    return ordered.map((code) => ({
      code,
      label: LANGUAGES.find((l) => l.code === code)?.label ?? code,
      local: local.includes(code)
    }));
  }, [country.countryCode]);

  const fade = useRef(new Animated.Value(1)).current;
  const rise = useRef(new Animated.Value(0)).current;

  // The market-rate question only means something where the street rate and
  // the official one diverge, so it drops out of the flow everywhere else.
  const steps = useMemo<StepId[]>(
    () =>
      hasDualRate(country.currencyCode)
        ? ['welcome', 'country', 'language', 'rate', 'ready']
        : ['welcome', 'country', 'language', 'ready'],
    [country.currencyCode]
  );
  const step = steps[Math.min(index, steps.length - 1)];

  useEffect(() => {
    fade.setValue(0);
    rise.setValue(12);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [index, fade, rise]);

  // Names come from the translation files, keyed by country code, with the
  // English name as the fallback. A name field per language stopped scaling
  // once the app went past three languages.
  const countryName = (c: CountryCurrency) =>
    t(`countries.${c.countryCode}`, { defaultValue: c.countryNameEn });

  // Applied straight away, not at the end: the rest of onboarding should
  // already be in the language someone just picked.
  const chooseLanguage = (code: string) => {
    setLanguageChoice(code);
    void setLanguage(code);
  };

  const chooseCountry = (next: CountryCurrency) => {
    setCountry(next);
    // Keep the language sensible for the new country, unless the person has
    // already chosen one this country also reads.
    const local = getCountryLanguages(next.countryCode);
    if (!local.includes(language)) chooseLanguage(local[0]);
    setRate(String(per100Usd(next.currencyCode, exchangeRates)));
  };

  const suggestedRate = per100Usd(country.currencyCode, exchangeRates);
  const parsedRate = parseFloat(rate);
  const rateValid = !Number.isNaN(parsedRate) && parsedRate > 0;
  const canAdvance = step !== 'rate' || rateValid;

  const next = async () => {
    if (index < steps.length - 1) {
      setIndex(index + 1);
      return;
    }
    setSaving(true);
    try {
      await setCountryAndCurrency(country.countryCode, country.currencyCode);
      await setLanguage(language);
      if (hasDualRate(country.currencyCode) && rateValid) {
        await setMarketRate100USD(parsedRate);
      }
      await completeOnboarding();
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const back = () => setIndex((i) => Math.max(0, i - 1));

  const cta =
    step === 'welcome' ? t('onboarding.get_started') : step === 'ready' ? t('onboarding.enter_app') : t('common.continue');

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AuroraBackground />

        <View style={[styles.top, { paddingTop: Math.max(insets.top, 20) + 12 }]}>
          {index > 0 ? (
            <TouchableOpacity onPress={back} hitSlop={12} style={styles.backBtn}>
              <Text style={[styles.backTxt, { color: colors.textSecondary }]}>{`‹ ${t('common.back')}`}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}

          <View style={styles.dots}>
            {steps.map((s, i) => (
              <View
                key={s}
                style={[
                  styles.dot,
                  {
                    width: i === index ? 20 : 6,
                    backgroundColor: i === index ? colors.accent : colors.hairline
                  }
                ]}
              />
            ))}
          </View>

          <View style={styles.backBtn} />
        </View>

        <Animated.View
          style={[styles.body, { opacity: fade, transform: [{ translateY: rise }] }]}
        >
          {step === 'welcome' && (
            <View style={styles.centered}>
              <LinearGradient
                colors={[colors.heroGradient[0], colors.heroGradient[1], colors.heroGradient[2]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.mark, { shadowColor: colors.accent }]}
              >
                <Text style={styles.markLetter}>{t('app_name').charAt(0)}</Text>
              </LinearGradient>

              <Text style={[styles.h1, { color: colors.textPrimary }]}>{t('onboarding.welcome')}</Text>
              <Text style={[styles.sub, { color: colors.textSecondary }]}>
                {t('onboarding.welcome_sub')}
              </Text>

              <View style={styles.features}>
                {FEATURES.map((f) => (
                  <View
                    key={f.titleKey}
                    style={[
                      styles.feature,
                      {
                        backgroundColor: colors.glassStrong,
                        borderColor: colors.glassEdge,
                        borderRadius: radius.lg,
                        ...elevation.sm(colors.shadowColor)
                      }
                    ]}
                  >
                    <View
                      style={[
                        styles.featureIcon,
                        { backgroundColor: colors.accentMuted, borderRadius: radius.md }
                      ]}
                    >
                      <Icon name={f.icon} size={20} color={colors.accent} />
                    </View>
                    <View style={styles.featureText}>
                      <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                        {t(f.titleKey)}
                      </Text>
                      <Text style={[styles.featureBody, { color: colors.textSecondary }]}>
                        {t(f.bodyKey)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {step === 'country' && (
            <View style={styles.fill}>
              <Text style={[styles.h2, { color: colors.textPrimary }]}>
                {t('onboarding.select_country', t('onboarding.select_country'))}
              </Text>
              <Text style={[styles.sub2, { color: colors.textSecondary }]}>
                {t('onboarding.country_hint')}
              </Text>

              <FlatList
                data={countryList}
                keyExtractor={(i) => i.countryCode}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 12 }}
                renderItem={({ item }) => {
                  const on = country.countryCode === item.countryCode;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => chooseCountry(item)}
                      style={[
                        styles.countryRow,
                        {
                          backgroundColor: on ? colors.accentMuted : colors.glassStrong,
                          borderColor: on ? colors.accent : colors.glassEdge,
                          borderRadius: radius.md
                        }
                      ]}
                    >
                      <Text style={styles.flag}>{item.flag}</Text>
                      <View style={styles.fill}>
                        <Text style={[styles.countryName, { color: colors.textPrimary }]}>
                          {countryName(item)}
                        </Text>
                        <Text style={[styles.countryCurr, { color: colors.textMuted }]}>
                          {item.currencyCode} ({item.currencySymbol})
                        </Text>
                      </View>
                      {on && (
                        <View style={[styles.check, { backgroundColor: colors.accent }]}>
                          <Text style={styles.checkTxt}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}

          {step === 'language' && (
            <View style={styles.fill}>
              <Text style={[styles.h2, { color: colors.textPrimary }]}>
                {t('onboarding.select_language')}
              </Text>
              <Text style={[styles.sub2, { color: colors.textSecondary }]}>
                {t('onboarding.language_hint', { country: countryName(country) })}
              </Text>

              <FlatList
                data={languageList}
                keyExtractor={(i) => i.code}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 12 }}
                renderItem={({ item, index: i }) => {
                  const on = language === item.code;
                  const firstOther = !item.local && !!languageList[i - 1]?.local;
                  return (
                    <>
                      {firstOther && (
                        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>
                          {t('onboarding.other_languages')}
                        </Text>
                      )}
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => chooseLanguage(item.code)}
                        style={[
                          styles.countryRow,
                          {
                            backgroundColor: on ? colors.accentMuted : colors.glassStrong,
                            borderColor: on ? colors.accent : colors.glassEdge,
                            borderRadius: radius.md
                          }
                        ]}
                      >
                        <View style={styles.fill}>
                          <Text style={[styles.countryName, { color: colors.textPrimary }]}>
                            {item.label}
                          </Text>
                        </View>
                        {on && (
                          <View style={[styles.check, { backgroundColor: colors.accent }]}>
                            <Text style={styles.checkTxt}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </>
                  );
                }}
              />
            </View>
          )}

          {step === 'rate' && (
            <View style={styles.centeredTop}>
              <Text style={[styles.h2, { color: colors.textPrimary }]}>{t('onboarding.dollar_rate')}</Text>
              <Text style={[styles.sub2, { color: colors.textSecondary }]}>
                {t('onboarding.rate_hint')}
              </Text>

              <View
                style={[
                  styles.rateBox,
                  {
                    backgroundColor: colors.glassStrong,
                    borderColor: rateValid ? colors.glassEdge : colors.danger,
                    borderRadius: radius.lg,
                    ...elevation.md(colors.shadowColor)
                  }
                ]}
              >
                <Text style={[styles.rateLabel, { color: colors.textSecondary }]}>
                  100 $ =
                </Text>
                <TextInput
                  value={rate}
                  onChangeText={setRate}
                  keyboardType="number-pad"
                  style={[styles.rateInput, { color: colors.textPrimary }]}
                  placeholder={String(suggestedRate)}
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.rateLabel, { color: colors.textSecondary }]}>{country.currencySymbol}</Text>
              </View>

              {!rateValid && (
                <Text style={[styles.err, { color: colors.danger }]}>
                  {t('common.enter_positive_number')}
                </Text>
              )}
            </View>
          )}

          {step === 'ready' && (
            <View style={styles.centered}>
              <View style={[styles.tick, { backgroundColor: colors.accentMuted }]}>
                <Text style={[styles.tickTxt, { color: colors.accent }]}>✓</Text>
              </View>
              <Text style={[styles.h1, { color: colors.textPrimary }]}>{t('onboarding.ready')}</Text>
              <Text style={[styles.sub, { color: colors.textSecondary }]}>
                {t('onboarding.privacy_note')}
              </Text>

              <View
                style={[
                  styles.summary,
                  {
                    backgroundColor: colors.glassStrong,
                    borderColor: colors.glassEdge,
                    borderRadius: radius.lg,
                    ...elevation.sm(colors.shadowColor)
                  }
                ]}
              >
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryKey, { color: colors.textSecondary }]}>{t('settings.country')}</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                    {country.flag}  {countryName(country)}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryKey, { color: colors.textSecondary }]}>{t('common.currency')}</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                    {country.currencyCode} ({country.currencySymbol})
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryKey, { color: colors.textSecondary }]}>{t('settings.language')}</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                    {LANGUAGES.find((l) => l.code === language)?.label ?? language}
                  </Text>
                </View>
                {hasDualRate(country.currencyCode) && rateValid && (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryKey, { color: colors.textSecondary }]}>
                        {t('common.market_rate')}
                      </Text>
                      <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                        100$ = {parsedRate.toLocaleString('en-US')} {country.currencySymbol}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}
        </Animated.View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={next}
            disabled={!canAdvance || saving}
            style={{ opacity: canAdvance && !saving ? 1 : 0.5 }}
          >
            <LinearGradient
              colors={[colors.heroGradient[0], colors.heroGradient[2]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.cta, { borderRadius: radius.lg, shadowColor: colors.accent }]}
            >
              <Text style={styles.ctaTxt}>{saving ? t('common.please_wait') : cta}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  groupLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY_BOLD,
    marginTop: 14,
    marginBottom: 6,
    marginHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  root: { flex: 1 },
  fill: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8
  },
  backBtn: { minWidth: 74 },
  backTxt: { fontSize: 13.5, fontFamily: FONT_FAMILY_SEMIBOLD },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 99 },

  body: { flex: 1, paddingHorizontal: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centeredTop: { flex: 1, paddingTop: 24 },

  mark: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 12
  },
  markLetter: {
    fontSize: 52,
    lineHeight: 72,
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY_BOLD,
    includeFontPadding: false
  },

  h1: { fontSize: 25, fontFamily: FONT_FAMILY_BOLD, textAlign: 'center' },
  h2: { fontSize: 21, fontFamily: FONT_FAMILY_BOLD, marginBottom: 6 },
  sub: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    fontFamily: FONT_FAMILY
  },
  sub2: { fontSize: 13, lineHeight: 20, marginBottom: 16, fontFamily: FONT_FAMILY },

  features: { alignSelf: 'stretch', marginTop: 28, gap: 10 },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1
  },
  featureIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 14, fontFamily: FONT_FAMILY_BOLD },
  featureBody: { fontSize: 12, lineHeight: 18, marginTop: 3, fontFamily: FONT_FAMILY },

  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1
  },
  flag: { fontSize: 24 },
  countryName: { fontSize: 14.5, fontFamily: FONT_FAMILY_SEMIBOLD },
  countryCurr: { fontSize: 11.5, marginTop: 2, fontFamily: FONT_FAMILY },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkTxt: { color: '#FFFFFF', fontSize: 12, fontFamily: FONT_FAMILY_BOLD },

  rateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    marginTop: 6
  },
  rateLabel: { fontSize: 15, fontFamily: FONT_FAMILY_SEMIBOLD, flexShrink: 0 },
  rateInput: {
    flex: 1,
    // Without this a long number sets the row's minimum width and pushes the
    // currency symbol off the screen.
    minWidth: 0,
    fontSize: 24,
    fontFamily: FONT_FAMILY_BOLD,
    textAlign: 'center',
    padding: 0
  },
  err: { fontSize: 12, marginTop: 10, fontFamily: FONT_FAMILY },

  tick: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18
  },
  tickTxt: { fontSize: 36, fontFamily: FONT_FAMILY_BOLD },

  summary: { alignSelf: 'stretch', marginTop: 26, borderWidth: 1, paddingHorizontal: 16 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13
  },
  summaryKey: { fontSize: 13, fontFamily: FONT_FAMILY },
  summaryVal: { fontSize: 13.5, fontFamily: FONT_FAMILY_SEMIBOLD },
  divider: { height: 1 },

  footer: { paddingHorizontal: 20, paddingTop: 10 },
  cta: {
    paddingVertical: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8
  },
  ctaTxt: { color: '#FFFFFF', fontSize: 15.5, fontFamily: FONT_FAMILY_BOLD }
});
